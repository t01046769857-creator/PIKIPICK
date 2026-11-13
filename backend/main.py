from contextlib import asynccontextmanager
from datetime import datetime, timezone
import hashlib
import hmac
import logging
import secrets
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from .database import Database, failure_category, log_failure
from .books import BookApiError, BookRecommendationService, Data4LibraryClient, MAX_PAGE_SIZE
from .models import Activity, ActivityVersion, PlayEvent, Player, PlaySession, utcnow
from .schemas import EventCreate, SessionCreate
from .settings import ConfigurationError, Settings

logger = logging.getLogger("pikipick.api")


def timestamp(value: datetime | None):
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def hash_token(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def session_output(session: PlaySession):
    return {"id": session.id, "client_session_id": session.client_session_id,
            "activity_version_id": session.activity_version_id, "player_id": session.player_id,
            "mode": session.mode, "status": session.status, "details": session.details,
            "started_at": timestamp(session.started_at), "ended_at": timestamp(session.ended_at)}


def event_output(event: PlayEvent):
    return {"id": event.id, "session_id": event.session_id, "client_event_id": event.client_event_id,
            "sequence": event.sequence, "event_type": event.event_type,
            "round_index": event.round_index, "success": event.success, "score": event.score,
            "duration_ms": event.duration_ms, "details": event.details,
            "occurred_at": timestamp(event.occurred_at), "received_at": timestamp(event.received_at)}


def authorize_session(db: Session, session_id: UUID, authorization: str | None):
    session = db.get(PlaySession, str(session_id))
    if session is None:
        raise HTTPException(404, "Session not found")
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    if not token or not hmac.compare_digest(session.token_hash, hash_token(token)):
        raise HTTPException(401, "A valid session token is required")
    return session


def matching_event(existing: PlayEvent, payload: EventCreate):
    return all(getattr(existing, key) == value for key, value in payload.model_dump().items()
               if key != "client_event_id")


def version_config(version: ActivityVersion):
    if not isinstance(version.config, dict):
        raise HTTPException(503, "Activity version configuration is invalid")
    for key in ("modes", "event_types"):
        if key in version.config and (not isinstance(version.config[key], list)
            or not all(isinstance(value, str) for value in version.config[key])):
            raise HTTPException(503, "Activity version configuration is invalid")
    return version.config


def validate_event(payload: EventCreate, session: PlaySession, activity: Activity, version: ActivityVersion):
    config = version_config(version)
    if payload.event_type not in config.get("event_types", [payload.event_type]):
        raise HTTPException(422, "Event type is not enabled for this activity version")
    if activity.slug == "rock-paper-scissors" and payload.event_type not in ("round_result", "session_ended"):
        raise HTTPException(422, "Unsupported rock-paper-scissors event type")
    if payload.event_type == "session_ended":
        if payload.success is not None:
            raise HTTPException(422, "Session end must not contain a round result")
        return
    if activity.slug == "rock-paper-scissors" and payload.event_type == "round_result":
        detail = payload.details
        gestures = {"ROCK", "SCISSORS", "PAPER"}
        player, opponent = detail.get("player"), detail.get("opponent")
        if not isinstance(player, str) or not isinstance(opponent, str) or player not in gestures or opponent not in gestures:
            raise HTTPException(422, "A round needs valid player and opponent gestures")
        if detail.get("mode") != session.mode or payload.round_index is None:
            raise HTTPException(422, "Round mode and index must match the session")
        win = {"ROCK": "SCISSORS", "SCISSORS": "PAPER", "PAPER": "ROCK"}[player] == opponent
        expected = win if session.mode == "WIN" else player != opponent and not win if session.mode == "LOSE" else player == opponent
        if payload.success is not expected:
            raise HTTPException(422, "Round result is inconsistent with its gestures and mode")


def create_app(database: Database | None = None, book_service: BookRecommendationService | None = None):
    db_service = database or Database()
    books = book_service or BookRecommendationService(Data4LibraryClient(db_service.settings or Settings.from_env()))

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        try:
            await run_in_threadpool(db_service.check_connection)
            logger.info("Database connection check succeeded")
        except (ConfigurationError, SQLAlchemyError, OSError) as error:
            log_failure(error)
            logger.warning("API remains available; database routes will return 503 until configured")
        yield
        db_service.close()

    application = FastAPI(title="PIKIPICK API", version="0.1.0", lifespan=lifespan)
    application.state.database = db_service
    application.state.books = books
    application.add_middleware(CORSMiddleware,
        allow_origins=list((db_service.settings or Settings()).cors_origins),
        allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"])

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request, error):
        # Pydantic은 일반적으로 잘못된 입력을 그대로 돌려준다. 토큰이나 임의 상세 정보는 절대 다시 노출하지 않는다.
        return JSONResponse(status_code=422, content={"detail": [
            {"loc": list(item["loc"]), "type": item["type"], "msg": item["msg"]}
            for item in error.errors()]})

    @application.exception_handler(ConfigurationError)
    async def configuration_error(_request, error):
        log_failure(error)
        return JSONResponse(status_code=503, content={"detail": "Database is not configured", "code": "database_not_configured"})

    @application.exception_handler(SQLAlchemyError)
    async def database_error(_request, error):
        log_failure(error)
        status = 409 if isinstance(error, IntegrityError) else 503
        return JSONResponse(status_code=status, content={"detail": "Database operation could not be completed", "code": "constraint_conflict" if status == 409 else failure_category(error)})

    @application.exception_handler(BookApiError)
    async def book_api_error(_request, error):
        status = 429 if error.code == "book_api_rate_limited" else 422 if error.code == "book_activity_not_supported" else 503
        return JSONResponse(status_code=status, content={"detail": "Book recommendation service is unavailable", "code": error.code})

    @application.middleware("http")
    async def no_cache_and_body_limit(request: Request, call_next):
        length = request.headers.get("content-length")
        if length and (not length.isdigit() or int(length) > 32768):
            return JSONResponse(status_code=413, content={"detail": "Request body exceeds 32 KiB"})
        # Content-Length가 없는 청크 요청도 제한한다.
        if request.method == "POST":
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 32768:
                    return JSONResponse(status_code=413, content={"detail": "Request body exceeds 32 KiB"})
            request._body = bytes(body)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    def get_db():
        db_service.require_engine()
        with db_service.session_factory() as session:
            yield session

    @application.get("/health")
    def health():
        return {"status": "ok", "service": "pikipick-api"}

    @application.get("/health/db")
    def database_health():
        try:
            return db_service.check_connection()
        except (ConfigurationError, SQLAlchemyError, OSError) as error:
            log_failure(error)
            return JSONResponse(status_code=503, content={"status": "unavailable", "code": failure_category(error), "tls_verified": False})

    @application.get("/api/activities")
    def list_activities(db: Session = Depends(get_db)):
        activities = db.scalars(select(Activity).where(Activity.is_active.is_(True)).order_by(Activity.slug)).all()
        return {"activities": [{"id": activity.id, "slug": activity.slug, "title": activity.title,
            "description": activity.description, "versions": [{"id": version.id, "version": version.version,
                "config": version.config} for version in db.scalars(select(ActivityVersion).where(
                    ActivityVersion.activity_id == activity.id, ActivityVersion.is_active.is_(True)).order_by(ActivityVersion.created_at.desc()))]}
            for activity in activities]}

    @application.get("/api/books/search")
    def search_books(keyword: str = Query(min_length=1, max_length=80), age: int = Query(default=5, ge=5, le=7),
                     page: int = Query(default=1, ge=1, le=1000), limit: int = Query(default=10, ge=1, le=MAX_PAGE_SIZE)):
        return books.search(keyword.strip(), age, page, limit)

    @application.get("/api/books/popular")
    def popular_books(age: int = Query(ge=5, le=7), page: int = Query(default=1, ge=1, le=1000),
                      limit: int = Query(default=10, ge=1, le=MAX_PAGE_SIZE)):
        return books.popular(age, page, limit)

    @application.get("/api/books/recommendations")
    def book_recommendations(activity: str = Query(min_length=1, max_length=64), age: int = Query(ge=5, le=7),
                             limit: int = Query(default=10, ge=1, le=MAX_PAGE_SIZE)):
        return books.recommendations(activity, age, limit)

    @application.post("/api/sessions", status_code=201)
    def create_session(payload: SessionCreate, response: Response, db: Session = Depends(get_db)):
        existing = db.scalar(select(PlaySession).where(PlaySession.client_session_id == str(payload.client_session_id)))
        if existing:
            if not payload.session_token or not hmac.compare_digest(existing.token_hash, hash_token(payload.session_token)):
                raise HTTPException(409, "Client session id already exists")
            version = db.get(ActivityVersion, existing.activity_version_id)
            activity = db.get(Activity, version.activity_id)
            if (payload.mode != existing.mode or payload.activity_slug != activity.slug
                or payload.details != existing.details
                or payload.activity_version is not None and payload.activity_version != version.version
                or payload.player_id is not None and str(payload.player_id) != existing.player_id):
                raise HTTPException(409, "Session retry payload differs from the original")
            response.status_code = 200
            return {**session_output(existing), "session_token": payload.session_token}
        activity = db.scalar(select(Activity).where(Activity.slug == payload.activity_slug, Activity.is_active.is_(True)))
        if not activity:
            raise HTTPException(404, "Active activity not found")
        query = select(ActivityVersion).where(ActivityVersion.activity_id == activity.id, ActivityVersion.is_active.is_(True))
        if payload.activity_version is not None:
            query = query.where(ActivityVersion.version == payload.activity_version)
        version = db.scalar(query.order_by(ActivityVersion.created_at.desc()))
        if not version:
            raise HTTPException(404, "Active activity version not found")
        config = version_config(version)
        if "modes" in config and payload.mode not in config["modes"]:
            raise HTTPException(422, "Mode is not enabled for this activity version")
        if activity.slug == "rock-paper-scissors" and payload.mode not in ("WIN", "LOSE", "DRAW"):
            raise HTTPException(422, "A rock-paper-scissors session needs WIN, LOSE or DRAW mode")
        player = db.get(Player, str(payload.player_id)) if payload.player_id else None
        if player is None:
            player = Player(**({"id": str(payload.player_id)} if payload.player_id else {}), age_band=payload.age_band)
            db.add(player)
            db.flush()
        token = payload.session_token or secrets.token_urlsafe(32)
        session = PlaySession(client_session_id=str(payload.client_session_id), player_id=player.id,
            activity_version_id=version.id, token_hash=hash_token(token), mode=payload.mode, details=payload.details)
        db.add(session)
        db.commit()
        return {**session_output(session), "session_token": token}

    @application.post("/api/sessions/{session_id}/events", status_code=201)
    def save_event(session_id: UUID, payload: EventCreate, response: Response,
                   authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        session = authorize_session(db, session_id, authorization)
        version = db.get(ActivityVersion, session.activity_version_id)
        activity = db.get(Activity, version.activity_id)
        validate_event(payload, session, activity, version)
        existing = db.scalar(select(PlayEvent).where(PlayEvent.session_id == session.id,
                                                  PlayEvent.client_event_id == str(payload.client_event_id)))
        if existing:
            if not matching_event(existing, payload):
                raise HTTPException(409, "Event id already has different data")
            response.status_code = 200
            return event_output(existing)
        if session.status != "active":
            raise HTTPException(409, "Session is already completed")
        values = payload.model_dump()
        values["client_event_id"] = str(payload.client_event_id)
        event = PlayEvent(session_id=session.id, **values)
        db.add(event)
        if payload.event_type == "session_ended":
            session.status = "completed"
            session.ended_at = utcnow()
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.scalar(select(PlayEvent).where(PlayEvent.session_id == session.id,
                                                       PlayEvent.client_event_id == str(payload.client_event_id)))
            if existing and matching_event(existing, payload):
                response.status_code = 200
                return event_output(existing)
            raise HTTPException(409, "Event id or sequence conflicts with an existing event") from None
        return event_output(event)

    @application.get("/api/sessions/{session_id}")
    def read_session(session_id: UUID, authorization: str | None = Header(default=None),
                     after_sequence: int = Query(default=0, ge=0), limit: int = Query(default=100, ge=1, le=500),
                     db: Session = Depends(get_db)):
        session = authorize_session(db, session_id, authorization)
        events = db.scalars(select(PlayEvent).where(PlayEvent.session_id == session.id,
            PlayEvent.sequence > after_sequence).order_by(PlayEvent.sequence).limit(limit + 1)).all()
        more = len(events) > limit
        page = events[:limit]
        count = db.scalar(select(func.count()).select_from(PlayEvent).where(PlayEvent.session_id == session.id))
        return {"session": session_output(session), "events": [event_output(event) for event in page],
                "event_count": count, "has_more": more,
                "next_after_sequence": page[-1].sequence if page else after_sequence}

    return application


app = create_app()
