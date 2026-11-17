from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, Table, UniqueConstraint, Column
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


# Teacher tables deliberately use separate metadata.  The initial play-record migration
# fingerprint remains stable for existing TiDB installations; the LMS tables are added
# by a separate, additive migration revision.
class TeacherBase(DeclarativeBase):
    pass


# Resolves the cross-metadata foreign key. This placeholder is never created over the
# existing Base.players table because migrations run Base first and use checkfirst=True.
teacher_players = Table("players", TeacherBase.metadata, Column("id", String(36), primary_key=True))


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


class TeacherAccount(TeacherBase):
    __tablename__ = "teacher_accounts"
    __table_args__ = (
        CheckConstraint("role IN ('TEACHER', 'ADMIN')", name="ck_teacher_account_role"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="TEACHER")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TeacherChildAssignment(TeacherBase):
    __tablename__ = "teacher_child_assignments"
    __table_args__ = (
        UniqueConstraint("teacher_id", "player_id", name="uq_teacher_child_assignment"),
        Index("ix_teacher_child_teacher", "teacher_id"),
        Index("ix_teacher_child_player", "player_id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teacher_accounts.id"))
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TeacherAuthSession(TeacherBase):
    __tablename__ = "teacher_auth_sessions"
    __table_args__ = (Index("ix_teacher_auth_token", "token_hash", unique=True),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teacher_accounts.id"))
    token_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# Institution records use separate metadata so adding revision 0003 never changes
# the already-recorded 0002_teacher_lms fingerprint.
class InstitutionBase(DeclarativeBase):
    pass


institution_players = Table("players", InstitutionBase.metadata, Column("id", String(36), primary_key=True))
institution_teachers = Table("teacher_accounts", InstitutionBase.metadata, Column("id", String(36), primary_key=True))
institution_sessions = Table("play_sessions", InstitutionBase.metadata, Column("id", String(36), primary_key=True))


class Institution(InstitutionBase):
    __tablename__ = "institutions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Classroom(InstitutionBase):
    __tablename__ = "classrooms"
    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_classroom_institution_code"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"))
    code: Mapped[str] = mapped_column(String(80))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EnrolledChild(InstitutionBase):
    __tablename__ = "enrolled_children"
    __table_args__ = (Index("ix_enrolled_children_institution", "institution_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"))
    classroom_id: Mapped[str | None] = mapped_column(ForeignKey("classrooms.id"), nullable=True)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TeacherInstitutionMembership(InstitutionBase):
    __tablename__ = "teacher_institution_memberships"
    __table_args__ = (UniqueConstraint("teacher_id", "institution_id", name="uq_teacher_institution"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teacher_accounts.id"))
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class InstitutionPlayLease(InstitutionBase):
    __tablename__ = "institution_play_leases"
    __table_args__ = (Index("ix_institution_lease_token", "token_hash", unique=True),
                      Index("ix_institution_lease_child_status", "child_id", "status"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"))
    teacher_id: Mapped[str] = mapped_column(ForeignKey("teacher_accounts.id"))
    child_id: Mapped[str] = mapped_column(ForeignKey("enrolled_children.id"))
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"))
    token_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="active")
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PlaySessionContext(InstitutionBase):
    __tablename__ = "play_session_contexts"
    __table_args__ = (UniqueConstraint("institution_lease_id", name="uq_session_context_lease"),)
    session_id: Mapped[str] = mapped_column(ForeignKey("play_sessions.id"), primary_key=True)
    environment: Mapped[str] = mapped_column(String(16), default="HOME")
    institution_id: Mapped[str | None] = mapped_column(ForeignKey("institutions.id"), nullable=True)
    institution_lease_id: Mapped[str | None] = mapped_column(ForeignKey("institution_play_leases.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# Personal education managers can access HOME history only after a separate
# approval record exists. These tables are deliberately separate from the
# legacy institution model and are not applied by the default migration command.
class ManagerHomeBase(DeclarativeBase):
    pass


manager_home_players = Table("players", ManagerHomeBase.metadata, Column("id", String(36), primary_key=True))
manager_home_accounts = Table("teacher_accounts", ManagerHomeBase.metadata, Column("id", String(36), primary_key=True))


class HomeRecordAccessGrant(ManagerHomeBase):
    __tablename__ = "home_record_access_grants"
    __table_args__ = (
        UniqueConstraint("manager_id", "player_id", "scope", name="uq_manager_home_grant"),
        Index("ix_manager_home_grant_manager_status", "manager_id", "status"),
        Index("ix_manager_home_grant_player_status", "player_id", "status"),
        CheckConstraint("status IN ('approved', 'revoked')", name="ck_manager_home_grant_status"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    manager_id: Mapped[str] = mapped_column(ForeignKey("teacher_accounts.id"))
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"))
    # Opaque reference only; guardian identity or consent text is not copied here.
    approval_reference: Mapped[str] = mapped_column(String(128), unique=True)
    scope: Mapped[str] = mapped_column(String(32), default="HOME_PLAY_HISTORY")
    status: Mapped[str] = mapped_column(String(16), default="approved")
    approved_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ManagerAccessAuditLog(ManagerHomeBase):
    __tablename__ = "manager_access_audit_logs"
    __table_args__ = (Index("ix_manager_access_audit_manager_created", "manager_id", "created_at"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    manager_id: Mapped[str] = mapped_column(ForeignKey("teacher_accounts.id"))
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"))
    action: Mapped[str] = mapped_column(String(64))
    outcome: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
