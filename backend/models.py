from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ActivityVersion(Base):
    __tablename__ = "activity_versions"
    __table_args__ = (UniqueConstraint("activity_id", "version", name="uq_activity_version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    activity_id: Mapped[str] = mapped_column(ForeignKey("activities.id"))
    version: Mapped[str] = mapped_column(String(32))
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (CheckConstraint("age_band IS NULL OR age_band IN (5, 6, 7)", name="ck_player_age_band"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    age_band: Mapped[int | None] = mapped_column(Integer, nullable=True)
    locale: Mapped[str] = mapped_column(String(16), default="ko")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PlaySession(Base):
    __tablename__ = "play_sessions"
    __table_args__ = (
        Index("ix_sessions_player_started", "player_id", "started_at"),
        Index("ix_sessions_version_started", "activity_version_id", "started_at"),
        CheckConstraint("status IN ('active', 'completed')", name="ck_session_status"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    client_session_id: Mapped[str] = mapped_column(String(36), unique=True)
    activity_version_id: Mapped[str] = mapped_column(ForeignKey("activity_versions.id"))
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"))
    token_hash: Mapped[str] = mapped_column(String(64))
    mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="active")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PlayEvent(Base):
    __tablename__ = "play_events"
    __table_args__ = (
        UniqueConstraint("session_id", "client_event_id", name="uq_session_client_event"),
        UniqueConstraint("session_id", "sequence", name="uq_session_event_sequence"),
        CheckConstraint("sequence > 0", name="ck_event_sequence"),
        CheckConstraint("round_index IS NULL OR round_index > 0", name="ck_event_round"),
        CheckConstraint("duration_ms IS NULL OR duration_ms >= 0", name="ck_event_duration"),
        Index("ix_events_session_time", "session_id", "occurred_at"),
        Index("ix_events_type_received", "event_type", "received_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("play_sessions.id"))
    client_event_id: Mapped[str] = mapped_column(String(36))
    sequence: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(64))
    round_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
