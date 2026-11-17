from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import logging
import secrets
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from .database import Database, failure_category, log_failure
from .books import BookApiError, BookRecommendationService, Data4LibraryClient, MAX_PAGE_SIZE
from .content_catalog import get_content, public_catalog
from .content_analysis import calculate_metrics
from .content_recommendations import recommend_from_history
from .models import (Activity, ActivityVersion, EnrolledChild, HomeRecordAccessGrant, InstitutionPlayLease,
                     ManagerAccessAuditLog,
                     PlayEvent, Player, PlaySession, PlaySessionContext,
                     TeacherAccount, TeacherAuthSession, TeacherChildAssignment,
                     TeacherInstitutionMembership, utcnow)
from .schemas import EventCreate, InstitutionPlayLeaseCreate, SessionCreate, TeacherLogin
from .settings import ConfigurationError, Settings

logger = logging.getLogger("pikipick.api")


def timestamp(value: datetime | None):
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def hash_token(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    """Use a salted, memory-hard stdlib hash; raw passwords never reach the DB."""
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt$16384$8$1${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt_hex),
                                n=int(n), r=int(r), p=int(p))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (TypeError, ValueError):
        return False


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


def authorize_teacher(db: Session, authorization: str | None) -> TeacherAccount:
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(401, "Teacher authentication is required")
    auth = db.scalar(select(TeacherAuthSession).where(TeacherAuthSession.token_hash == hash_token(token)))
    if auth is None or auth.expires_at <= utcnow():
        raise HTTPException(401, "Teacher authentication is required")
    teacher = db.get(TeacherAccount, auth.teacher_id)
    if teacher is None or not teacher.is_active or teacher.role not in {"TEACHER", "ADMIN"}:
        raise HTTPException(403, "Teacher access is not available")
    return teacher


def authorize_child_access(db: Session, teacher: TeacherAccount, player_id: UUID) -> Player:
    player = db.get(Player, str(player_id))
    if player is None:
        raise HTTPException(404, "Child record not found")
    if teacher.role == "ADMIN":
        return player
    assignment = db.scalar(select(TeacherChildAssignment).where(
        TeacherChildAssignment.teacher_id == teacher.id,
        TeacherChildAssignment.player_id == player.id,
        TeacherChildAssignment.is_active.is_(True),
    ))
    if assignment is None:
        # Do not disclose whether a different child id exists to this teacher.
        raise HTTPException(403, "You are not assigned to this child")
    return player


def authorize_manager_home_access(db: Session, manager: TeacherAccount, player_id: UUID) -> tuple[Player, HomeRecordAccessGrant]:
    player = db.get(Player, str(player_id))
    if player is None:
        raise HTTPException(404, "Child record not found")
    grant = db.scalar(select(HomeRecordAccessGrant).where(
        HomeRecordAccessGrant.manager_id == manager.id,
        HomeRecordAccessGrant.player_id == player.id,
        HomeRecordAccessGrant.scope == "HOME_PLAY_HISTORY",
        HomeRecordAccessGrant.status == "approved",
    ))
    if grant is None or grant.revoked_at is not None or (grant.expires_at is not None and grant.expires_at <= utcnow()):
        raise HTTPException(403, "Approved HOME record access is required")
    return player, grant


def manager_home_dashboard_output(db: Session, player: Player, grant: HomeRecordAccessGrant, days: int):
    """Return only records after the approved sharing start time.

    This does not identify a child from a browser id. Creation of a grant is an
    external, approved workflow and is intentionally not exposed to HOME users.
    """
    since = max(utcnow() - timedelta(days=days), grant.approved_at)
    sessions = db.scalars(select(PlaySession).where(
        PlaySession.player_id == player.id, PlaySession.started_at >= since
    ).order_by(PlaySession.started_at.desc())).all()
    session_ids = [item.id for item in sessions]
    events = [] if not session_ids else db.scalars(select(PlayEvent).where(
        PlayEvent.session_id.in_(session_ids)).order_by(PlayEvent.occurred_at)).all()
    versions = {item.id: item for item in db.scalars(select(ActivityVersion)).all()}
    activities = {item.id: item for item in db.scalars(select(Activity)).all()}
    by_session: dict[str, list[PlayEvent]] = {item.id: [] for item in sessions}
    for event in events: by_session.setdefault(event.session_id, []).append(event)
    by_activity: dict[str, list[PlayEvent]] = {}
    for session in sessions:
        version = versions.get(session.activity_version_id)
        activity = activities.get(version.activity_id) if version else None
        if activity: by_activity.setdefault(activity.slug, []).extend(by_session.get(session.id, []))
    metrics = [calculate_metrics(slug, activity_events) for slug, activity_events in by_activity.items()]
    activity_summary: dict[str, dict] = {}
    daily: dict[str, dict] = {}
    weekday: dict[int, dict] = {}
    rules: dict[str, dict] = {}
    gestures: dict[str, int] = {}
    recent_events = []
    for session in sessions:
        version = versions.get(session.activity_version_id)
        activity = activities.get(version.activity_id) if version else None
        if activity is None:
            continue
        rounds = [event for event in by_session.get(session.id, []) if event.event_type == "round_result"]
        item = activity_summary.setdefault(activity.slug, {
            "activity": activity.title, "activity_slug": activity.slug,
            "participations": 0, "attempts": 0, "target_choices": 0, "target_misses": 0,
        })
        item["participations"] += 1
        item["attempts"] += len(rounds)
        item["target_choices"] += sum(event.success is True for event in rounds)
        item["target_misses"] += sum(event.success is False for event in rounds)
        day = session.started_at.date().isoformat()
        day_item = daily.setdefault(day, {"date": day, "participations": 0, "attempts": 0, "target_choices": 0})
        day_item["participations"] += 1
        day_item["attempts"] += len(rounds)
        day_item["target_choices"] += sum(event.success is True for event in rounds)
        weekday_item = weekday.setdefault(session.started_at.weekday(), {"weekday": session.started_at.weekday(), "participations": 0, "attempts": 0})
        weekday_item["participations"] += 1
        weekday_item["attempts"] += len(rounds)
        for event in rounds:
            details = event.details if isinstance(event.details, dict) else {}
            rule = str(details.get("mode") or session.mode or "미기록")
            rule_item = rules.setdefault(rule, {"rule": rule, "attempts": 0, "target_choices": 0, "target_misses": 0})
            rule_item["attempts"] += 1
            rule_item["target_choices"] += event.success is True
            rule_item["target_misses"] += event.success is False
            player_gesture = details.get("player")
            if isinstance(player_gesture, str):
                gestures[player_gesture] = gestures.get(player_gesture, 0) + 1
            recent_events.append({
                "id": event.id, "session_id": event.session_id, "occurred_at": timestamp(event.occurred_at),
                "event_type": event.event_type, "round_index": event.round_index, "success": event.success,
                "details": {key: details[key] for key in ("mode", "player", "opponent") if key in details},
            })
    total_attempts = sum(item["attempts"] for item in activity_summary.values())
    total_matches = sum(item["target_choices"] for item in activity_summary.values())
    plan = recommend_from_history(by_activity.keys())
    return {"child": {"id": player.id, "age_band": player.age_band},
            "scope": "HOME_PLAY_HISTORY", "shared_from": timestamp(grant.approved_at), "period_days": days,
            "session_count": len(sessions), "content_metrics": metrics,
            "summary": {"participations": len(sessions), "attempts": total_attempts,
                        "target_choices": total_matches, "target_misses": total_attempts - total_matches,
                        "retry_count": None, "retry_supported": False},
            "activities": sorted(activity_summary.values(), key=lambda item: item["attempts"], reverse=True),
            "trend": [daily[key] for key in sorted(daily)],
            "weekday_distribution": [weekday[key] for key in sorted(weekday)],
            "rule_distribution": list(rules.values()),
            "gesture_distribution": [{"gesture": key, "count": gestures[key]} for key in sorted(gestures)],
            "recent_events": sorted(recent_events, key=lambda item: item["occurred_at"] or "", reverse=True)[:100],
            "metric_evidence": [{"activity_slug": item["activity_slug"], "period_days": days,
                                 "event_count": sum(1 for event in by_activity.get(item["activity_slug"], []) if event.event_type == "round_result"),
                                 "formula": "goal_matched_choice = count(round_result.success == true)",
                                 "data_version": "content-analysis-v1",
                                 "limitations": ["retry는 현재 이벤트 스키마에서 지원하지 않음", "놀이 기록만으로 발달 수준을 판정하지 않음"],
                                 "metrics": next((metric["metrics"] for metric in metrics if metric["activity_slug"] == item["activity_slug"]), [])}
                                for item in activity_summary.values()],
            "education_evidence": {"status": "unsupported", "reason": "검증된 공식 누리과정 출처 매핑이 연결되기 전에는 교육적 점수를 표시하지 않습니다."},
            "recommendations": [{"kind": "next_activity", "title": item["title"], "reason": item["reason"],
                                 "action": "놀이 선택 화면에서 교사가 선택할 수 있습니다.", "available_path": "/play/games"}
                                for item in plan["next_activities"]],
            "recommendation_basis": plan["reason"], "book_recommendation_topic": plan["book_topic"],
            "book_recommendations": {"status": "unavailable", "reason": "도서관 정보나루 API 승인 전에는 실제 도서를 추천하지 않습니다."}}


def authorize_institution_child(db: Session, teacher: TeacherAccount, player_id: UUID) -> EnrolledChild:
    player = authorize_child_access(db, teacher, player_id)
    child = db.scalar(select(EnrolledChild).where(
        EnrolledChild.player_id == player.id, EnrolledChild.is_active.is_(True)))
    if child is None:
        raise HTTPException(403, "This child is not enrolled for institution play")
    membership = db.scalar(select(TeacherInstitutionMembership).where(
        TeacherInstitutionMembership.teacher_id == teacher.id,
        TeacherInstitutionMembership.institution_id == child.institution_id,
        TeacherInstitutionMembership.is_active.is_(True)))
    if teacher.role != "ADMIN" and membership is None:
        raise HTTPException(403, "Teacher is not active in this institution")
    return child


def active_institution_lease(db: Session, token: str) -> InstitutionPlayLease:
    lease = db.scalar(select(InstitutionPlayLease).where(
        InstitutionPlayLease.token_hash == hash_token(token)))
    if lease is None or lease.status != "active" or lease.expires_at <= utcnow():
        raise HTTPException(401, "A valid institution play token is required")
    return lease


def legacy_institution_schema_available(db: Session) -> bool:
    """Keep HOME play independent from the optional 0003 institution schema."""
    return inspect(db.get_bind()).has_table("play_session_contexts")


def require_legacy_institution_schema(db: Session):
    if not legacy_institution_schema_available(db):
        raise HTTPException(503, "Institution play is not enabled for this database")


def teacher_dashboard_output(db: Session, player: Player, days: int):
    since = utcnow() - timedelta(days=days)
    # LMS deliberately sees only server-issued institution play, never HOME or
    # legacy anonymous sessions from a shared family device.
    sessions = db.scalars(select(PlaySession).join(
        PlaySessionContext, PlaySessionContext.session_id == PlaySession.id
    ).where(PlaySession.player_id == player.id, PlaySession.started_at >= since,
            PlaySessionContext.environment == "INSTITUTION").order_by(PlaySession.started_at.desc())).all()
    session_ids = [session.id for session in sessions]
    events = [] if not session_ids else db.scalars(select(PlayEvent).where(
        PlayEvent.session_id.in_(session_ids), PlayEvent.event_type == "round_result"
    ).order_by(PlayEvent.occurred_at)).all()
    versions = {version.id: version for version in db.scalars(select(ActivityVersion)).all()}
    activities = {activity.id: activity for activity in db.scalars(select(Activity)).all()}
    event_by_session: dict[str, list[PlayEvent]] = {session_id: [] for session_id in session_ids}
    for event in events:
        event_by_session.setdefault(event.session_id, []).append(event)
    activity_summary: dict[str, dict] = {}
    daily: dict[str, dict] = {}
    recent = []
    for session in sessions:
        version = versions.get(session.activity_version_id)
        activity = activities.get(version.activity_id) if version else None
        rounds = event_by_session.get(session.id, [])
        attempts = len(rounds)
        target_choices = sum(event.success is True for event in rounds)
        target_misses = sum(event.success is False for event in rounds)
        title = activity.title if activity else "Unknown activity"
        key = activity.slug if activity else "unknown"
        summary = activity_summary.setdefault(key, {"activity": title, "activity_slug": key,
            "participations": 0, "attempts": 0, "target_choices": 0, "target_misses": 0})
        summary["participations"] += 1; summary["attempts"] += attempts
        summary["target_choices"] += target_choices; summary["target_misses"] += target_misses
        day = session.started_at.date().isoformat()
        trend = daily.setdefault(day, {"date": day, "participations": 0, "attempts": 0, "target_choices": 0})
        trend["participations"] += 1; trend["attempts"] += attempts; trend["target_choices"] += target_choices
        recent.append({"date": timestamp(session.started_at), "activity": title, "activity_slug": key,
            "rule": session.mode, "attempts": attempts, "target_choices": target_choices,
            "target_misses": target_misses, "status": session.status})
    attempts = sum(item["attempts"] for item in activity_summary.values())
    target_choices = sum(item["target_choices"] for item in activity_summary.values())
    content_metrics = []
    for slug in activity_summary:
        related_events = []
        for session in sessions:
            version = versions.get(session.activity_version_id)
            activity = activities.get(version.activity_id) if version else None
            if activity and activity.slug == slug:
                related_events.extend(event_by_session.get(session.id, []))
        content_metrics.append(calculate_metrics(slug, related_events))
    recommendation_plan = recommend_from_history(activity_summary.keys())
    recommendations = []
    modes = {session.mode for session in sessions if session.mode in {"WIN", "LOSE", "DRAW"}}
    if len(sessions) >= 2 and len(modes) == 1:
        recommendations.append({"kind": "rule_variation", "title": "같은 놀이, 다른 규칙으로 해 보기",
            "reason": "최근 같은 규칙을 반복해서 경험했어요.", "action": "교사가 가위바위보의 다른 규칙을 선택해 제안하세요.", "available_path": "/play/games"})
    elif sessions:
        recommendations.append({"kind": "guided_reflection", "title": "방금 고른 손을 함께 이야기해 보기",
            "reason": "최근 놀이 경험을 말과 그림으로 다시 연결할 수 있어요.", "action": "교사가 최근 놀이의 규칙과 선택을 짧게 되짚어 보세요.", "available_path": None})
    return {"child": {"id": player.id, "age_band": player.age_band}, "period_days": days,
        "summary": {"participations": len(sessions), "attempts": attempts,
                    "target_choices": target_choices, "target_misses": attempts - target_choices,
                    "retry_count": None, "retry_supported": False},
        "activities": sorted(activity_summary.values(), key=lambda item: item["attempts"], reverse=True),
        "content_metrics": content_metrics,
        "trend": [daily[key] for key in sorted(daily)], "recent_sessions": recent[:20],
        "recommendations": recommendations,
        "recommendation_basis": recommendation_plan["reason"],
        "book_recommendation_topic": recommendation_plan["book_topic"],
        "book_recommendations": {"status": "unavailable", "reason": "도서관 정보나루 API 승인 전에는 실제 도서를 추천하지 않습니다."}}


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
    content = get_content(activity.slug)
    if content and content.status == "PLAYABLE" and payload.event_type not in content.event_types:
        raise HTTPException(422, f"Unsupported {activity.slug} event type")
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

    @application.get("/api/content-catalog")
    def content_catalog():
        """LXP discovery metadata; COMING_SOON never means executable."""
        return {"contents": public_catalog()}

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

    @application.post("/api/teacher/auth/login")
    def teacher_login(payload: TeacherLogin, db: Session = Depends(get_db)):
        # A generic response prevents email/account enumeration.
        teacher = db.scalar(select(TeacherAccount).where(TeacherAccount.email == payload.email.strip().lower()))
        if teacher is None or not teacher.is_active or not verify_password(payload.password, teacher.password_hash):
            raise HTTPException(401, "Invalid teacher credentials")
        raw_token = secrets.token_urlsafe(32)
        expires_at = utcnow() + timedelta(hours=8)
        db.add(TeacherAuthSession(teacher_id=teacher.id, token_hash=hash_token(raw_token), expires_at=expires_at))
        db.commit()
        return {"access_token": raw_token, "token_type": "Bearer", "expires_at": timestamp(expires_at),
                "teacher": {"role": teacher.role}}

    @application.get("/api/teacher/me")
    def teacher_me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        teacher = authorize_teacher(db, authorization)
        return {"id": teacher.id, "role": teacher.role}

    @application.get("/api/teacher/children")
    def teacher_children(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        teacher = authorize_teacher(db, authorization)
        query = select(TeacherChildAssignment).where(TeacherChildAssignment.is_active.is_(True))
        if teacher.role != "ADMIN":
            query = query.where(TeacherChildAssignment.teacher_id == teacher.id)
        assignments = db.scalars(query.order_by(TeacherChildAssignment.created_at.desc())).all()
        children = []
        for assignment in assignments:
            player = db.get(Player, assignment.player_id)
            if player:
                children.append({"id": player.id, "age_band": player.age_band, "assigned_at": timestamp(assignment.created_at)})
        return {"children": children}

    @application.get("/api/teacher/children/{player_id}/dashboard")
    def teacher_child_dashboard(player_id: UUID, days: int = Query(default=30, ge=1, le=365),
                                authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        require_legacy_institution_schema(db)
        teacher = authorize_teacher(db, authorization)
        player = authorize_child_access(db, teacher, player_id)
        return teacher_dashboard_output(db, player, days)

    @application.get("/api/manager/children/{player_id}/home-dashboard")
    def manager_home_dashboard(player_id: UUID, days: int = Query(default=30, ge=1, le=365),
                               authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        manager = authorize_teacher(db, authorization)
        player, grant = authorize_manager_home_access(db, manager, player_id)
        output = manager_home_dashboard_output(db, player, grant, days)
        db.add(ManagerAccessAuditLog(manager_id=manager.id, player_id=player.id,
                                     action="READ_HOME_DASHBOARD", outcome="allowed"))
        db.commit()
        return output

    @application.post("/api/teacher/children/{player_id}/institution-play")
    def issue_institution_play(player_id: UUID, payload: InstitutionPlayLeaseCreate,
                               authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        require_legacy_institution_schema(db)
        teacher = authorize_teacher(db, authorization)
        child = authorize_institution_child(db, teacher, player_id)
        raw_token = secrets.token_urlsafe(32)
        expires_at = utcnow() + timedelta(minutes=payload.expires_in_minutes)
        lease = InstitutionPlayLease(institution_id=child.institution_id, teacher_id=teacher.id,
            child_id=child.id, player_id=child.player_id, token_hash=hash_token(raw_token), expires_at=expires_at)
        db.add(lease); db.commit()
        # This capability is for one child play handoff only. It is not a teacher
        # credential and carries no teacher API authority.
        return {"institution_play_token": raw_token, "expires_at": timestamp(expires_at),
                "player_id": child.player_id, "environment": "INSTITUTION"}

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
        if payload.institution_play_token:
            require_legacy_institution_schema(db)
        legacy_schema = legacy_institution_schema_available(db)
        lease = active_institution_lease(db, payload.institution_play_token) if payload.institution_play_token else None
        if lease and payload.player_id is not None and str(payload.player_id) != lease.player_id:
            raise HTTPException(403, "Institution play token does not belong to this player")
        player = db.get(Player, lease.player_id if lease else str(payload.player_id)) if (lease or payload.player_id) else None
        if player is None:
            player = Player(**({"id": str(payload.player_id)} if payload.player_id else {}), age_band=payload.age_band)
            db.add(player)
            db.flush()
        token = payload.session_token or secrets.token_urlsafe(32)
        session = PlaySession(client_session_id=str(payload.client_session_id), player_id=player.id,
            activity_version_id=version.id, token_hash=hash_token(token), mode=payload.mode, details=payload.details)
        db.add(session)
        db.flush()
        if lease:
            lease.status = "claimed"
            db.add(PlaySessionContext(session_id=session.id, environment="INSTITUTION",
                institution_id=lease.institution_id, institution_lease_id=lease.id))
        elif legacy_schema:
            db.add(PlaySessionContext(session_id=session.id, environment="HOME"))
        db.commit()
        return {**session_output(session), "session_token": token}

    @application.post("/api/sessions/{session_id}/events", status_code=201)
    def save_event(session_id: UUID, payload: EventCreate, response: Response,
                   authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        session = authorize_session(db, session_id, authorization)
        context = db.get(PlaySessionContext, session.id) if legacy_institution_schema_available(db) else None
        if context and context.environment == "INSTITUTION":
            lease = db.get(InstitutionPlayLease, context.institution_lease_id)
            if lease is None or lease.status != "claimed" or lease.expires_at <= utcnow():
                raise HTTPException(401, "Institution play session is no longer active")
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
            if context and context.environment == "INSTITUTION":
                lease.status = "ended"
                lease.ended_at = session.ended_at
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
