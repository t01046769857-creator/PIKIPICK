"""Explicit, additive migrations. No DROP, TRUNCATE, DELETE or data updates."""
import argparse
import hashlib
import json
import logging
import sys
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, MetaData, String, Table, inspect, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from .database import Database, failure_category, log_failure
from .models import Activity, ActivityVersion, Base, InstitutionBase, ManagerHomeBase, TeacherBase, utcnow
from .settings import ConfigurationError

REVISION = "0001_initial_activities"
TEACHER_LMS_REVISION = "0002_teacher_lms"
INSTITUTION_SESSIONS_REVISION = "0003_institution_sessions"
MANAGER_HOME_ACCESS_REVISION = "0004_manager_home_access"
journal = Table("schema_migrations", MetaData(),
                Column("version", String(64), primary_key=True),
                Column("schema_hash", String(64), nullable=False),
                Column("applied_at", DateTime, nullable=False))


class SchemaConflict(Exception):
    pass


def schema_fingerprint(metadata=Base.metadata):
    shape = {}
    for table in metadata.sorted_tables:
        shape[table.name] = {
            "columns": [(c.name, c.type._type_affinity.__name__, getattr(c.type, "length", None), c.nullable, c.primary_key) for c in table.columns],
            "unique": sorted(tuple(c.name for c in item.columns) for item in table.constraints if item.__class__.__name__ == "UniqueConstraint"),
            "indexes": sorted((item.name, tuple(c.name for c in item.columns)) for item in table.indexes),
            "foreign_keys": sorted((c.name, fk.target_fullname) for c in table.columns for fk in c.foreign_keys),
            "checks": sorted(str(item.sqltext) for item in table.constraints if item.__class__.__name__ == "CheckConstraint"),
        }
    return hashlib.sha256(json.dumps(shape, sort_keys=True).encode()).hexdigest()


def teacher_lms_tables():
    """Return the three tables owned by revision 0002.

    TeacherBase has a small ``players`` placeholder only to resolve a foreign
    key across metadata collections.  The actual players table is owned and
    validated by Base, so it is deliberately excluded here.
    """
    return [table for table in TeacherBase.metadata.sorted_tables if table.name != "players"]


def institution_tables():
    return [table for table in InstitutionBase.metadata.sorted_tables
            if table.name not in {"players", "teacher_accounts", "play_sessions"}]


def manager_home_tables():
    return [table for table in ManagerHomeBase.metadata.sorted_tables
            if table.name not in {"players", "teacher_accounts"}]


def inventory(engine: Engine):
    inspector = inspect(engine)
    return {table: [column["name"] for column in inspector.get_columns(table)]
            for table in inspector.get_table_names()}


def assert_compatible(engine: Engine):
    """Refuse collisions before any DDL; never rewrite an existing table."""
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    for table in [journal, *Base.metadata.sorted_tables, *teacher_lms_tables(), *institution_tables(), *manager_home_tables()]:
        if table.name not in existing:
            continue
        columns = {c["name"]: c for c in inspector.get_columns(table.name)}
        if set(columns) != set(table.columns.keys()):
            raise SchemaConflict(f"Existing table {table.name} has a different set of columns")
        for expected in table.columns:
            actual = columns.get(expected.name)
            boolean_as_integer = isinstance(expected.type, Boolean) and actual is not None and isinstance(actual["type"], Integer)
            # MariaDB reflects its JSON alias as LONGTEXT. The CREATE TABLE
            # statement still retains the JSON validity constraint, so accept
            # that documented reflection difference only in a local restore.
            json_as_text = isinstance(expected.type, JSON) and actual is not None and type(actual["type"]).__name__ in {"LONGTEXT", "TEXT"}
            if actual is None or (actual["type"]._type_affinity is not expected.type._type_affinity and not boolean_as_integer and not json_as_text):
                raise SchemaConflict(f"Existing table {table.name} has incompatible column {expected.name}")
            if isinstance(expected.type, String) and actual["type"].length != expected.type.length:
                raise SchemaConflict(f"Existing table {table.name} has incompatible length for {expected.name}")
            if not expected.nullable and actual.get("nullable"):
                raise SchemaConflict(f"Existing table {table.name} permits NULL for {expected.name}")
        pk = set(inspector.get_pk_constraint(table.name).get("constrained_columns") or [])
        if pk != {c.name for c in table.primary_key}:
            raise SchemaConflict(f"Existing table {table.name} has an incompatible primary key")
        actual_unique = {tuple(item["column_names"]) for item in inspector.get_unique_constraints(table.name)}
        actual_unique |= {tuple(item["column_names"]) for item in inspector.get_indexes(table.name) if item.get("unique")}
        for constraint in table.constraints:
            if constraint.__class__.__name__ == "UniqueConstraint" and tuple(c.name for c in constraint.columns) not in actual_unique:
                raise SchemaConflict(f"Existing table {table.name} is missing unique constraint {constraint.name or 'unique'}")
        actual_indexes = {tuple(item["column_names"]) for item in inspector.get_indexes(table.name)}
        for index in table.indexes:
            if tuple(c.name for c in index.columns) not in actual_indexes:
                raise SchemaConflict(f"Existing table {table.name} is missing index {index.name}")
        actual_fks = {(tuple(fk["constrained_columns"]), fk["referred_table"], tuple(fk["referred_columns"]))
                      for fk in inspector.get_foreign_keys(table.name)}
        for fk in table.foreign_key_constraints:
            signature = (tuple(c.name for c in fk.columns), list(fk.elements)[0].column.table.name,
                         tuple(item.column.name for item in fk.elements))
            if signature not in actual_fks:
                raise SchemaConflict(f"Existing table {table.name} has an incompatible foreign key")
    return existing


def recorded_revisions(engine: Engine, existing: set[str]):
    if journal.name not in existing:
        return {}
    with engine.connect() as connection:
        return {row.version: row.schema_hash
                for row in connection.execute(select(journal.c.version, journal.c.schema_hash))}


def assert_revision_matches_tables(engine: Engine, existing: set[str]):
    """Stop on interrupted 0002 DDL instead of letting ``checkfirst`` hide it.

    MySQL-compatible DDL can commit each table independently. A failure might
    therefore leave only part of the LMS schema created. That state requires
    operator inspection; this migration never deletes or repairs it implicitly.
    """
    revisions = recorded_revisions(engine, existing)
    if set(revisions) - {REVISION, TEACHER_LMS_REVISION, INSTITUTION_SESSIONS_REVISION, MANAGER_HOME_ACCESS_REVISION}:
        raise SchemaConflict("Unknown migration revision; do not apply older code to this database")

    teacher_hash = schema_fingerprint(TeacherBase.metadata)
    if TEACHER_LMS_REVISION in revisions and revisions[TEACHER_LMS_REVISION] != teacher_hash:
        raise SchemaConflict("Teacher LMS schema changed without a new migration revision")

    expected_lms = {table.name for table in teacher_lms_tables()}
    actual_lms = expected_lms & existing
    revision_recorded = TEACHER_LMS_REVISION in revisions
    if revision_recorded and actual_lms != expected_lms:
        missing = ", ".join(sorted(expected_lms - actual_lms))
        raise SchemaConflict(f"Teacher LMS revision is recorded but required tables are missing: {missing}")
    if not revision_recorded and actual_lms:
        found = ", ".join(sorted(actual_lms))
        raise SchemaConflict(f"Teacher LMS tables exist without revision {TEACHER_LMS_REVISION}: {found}")

    institution_hash = schema_fingerprint(InstitutionBase.metadata)
    expected_institution = {table.name for table in institution_tables()}
    actual_institution = expected_institution & existing
    institution_recorded = INSTITUTION_SESSIONS_REVISION in revisions
    if institution_recorded and revisions[INSTITUTION_SESSIONS_REVISION] != institution_hash:
        raise SchemaConflict("Institution session schema changed without a new migration revision")
    if institution_recorded and actual_institution != expected_institution:
        missing = ", ".join(sorted(expected_institution - actual_institution))
        raise SchemaConflict(f"Institution session revision is recorded but required tables are missing: {missing}")
    if not institution_recorded and actual_institution:
        found = ", ".join(sorted(actual_institution))
        raise SchemaConflict(f"Institution session tables exist without revision {INSTITUTION_SESSIONS_REVISION}: {found}")
    manager_home_hash = schema_fingerprint(ManagerHomeBase.metadata)
    expected_manager_home = {table.name for table in manager_home_tables()}
    actual_manager_home = expected_manager_home & existing
    manager_home_recorded = MANAGER_HOME_ACCESS_REVISION in revisions
    if manager_home_recorded and revisions[MANAGER_HOME_ACCESS_REVISION] != manager_home_hash:
        raise SchemaConflict("Manager HOME schema changed without a new migration revision")
    if manager_home_recorded and actual_manager_home != expected_manager_home:
        missing = ", ".join(sorted(expected_manager_home - actual_manager_home))
        raise SchemaConflict(f"Manager HOME revision is recorded but required tables are missing: {missing}")
    if not manager_home_recorded and actual_manager_home:
        found = ", ".join(sorted(actual_manager_home))
        raise SchemaConflict(f"Manager HOME tables exist without revision {MANAGER_HOME_ACCESS_REVISION}: {found}")
    return revisions, teacher_hash, institution_hash, manager_home_hash


def apply_migrations(engine: Engine, *, include_lms: bool = False,
                     include_manager_home: bool = False,
                     include_legacy_institution: bool = False):
    """Apply only core tables by default.

    Optional LMS revisions require an explicit caller decision. The legacy
    institution schema is never selected merely because the LMS is selected.
    """
    if include_manager_home:
        include_lms = True
    existing = assert_compatible(engine)
    revisions, teacher_hash, institution_hash, manager_home_hash = assert_revision_matches_tables(engine, existing)
    # checkfirst와 검증을 함께 사용해 일부만 반영된 MySQL DDL 이후에도 안전하게 다시 실행할 수 있다.
    journal.create(engine, checkfirst=True)
    fingerprint = schema_fingerprint()
    if REVISION in revisions and revisions[REVISION] != fingerprint:
        raise SchemaConflict("Schema models changed without a new migration revision")
    for table in Base.metadata.sorted_tables:
        table.create(engine, checkfirst=True)
    if include_lms:
        TeacherBase.metadata.create_all(engine, checkfirst=True)
    if include_legacy_institution:
        InstitutionBase.metadata.create_all(engine, checkfirst=True)
    if include_manager_home:
        ManagerHomeBase.metadata.create_all(engine, checkfirst=True)
    with engine.begin() as connection:
        if REVISION not in revisions:
            connection.execute(journal.insert().values(version=REVISION, schema_hash=fingerprint, applied_at=utcnow()))
        if include_lms and TEACHER_LMS_REVISION not in revisions:
            connection.execute(journal.insert().values(version=TEACHER_LMS_REVISION, schema_hash=teacher_hash, applied_at=utcnow()))
        if include_legacy_institution and INSTITUTION_SESSIONS_REVISION not in revisions:
            connection.execute(journal.insert().values(version=INSTITUTION_SESSIONS_REVISION, schema_hash=institution_hash, applied_at=utcnow()))
        if include_manager_home and MANAGER_HOME_ACCESS_REVISION not in revisions:
            connection.execute(journal.insert().values(version=MANAGER_HOME_ACCESS_REVISION, schema_hash=manager_home_hash, applied_at=utcnow()))
    selected_tables = set(Base.metadata.tables)
    if include_lms: selected_tables |= set(TeacherBase.metadata.tables)
    if include_legacy_institution: selected_tables |= set(InstitutionBase.metadata.tables)
    if include_manager_home: selected_tables |= set(ManagerHomeBase.metadata.tables)
    return {"created_tables": sorted(selected_tables - existing),
            "included": {"lms": include_lms, "manager_home": include_manager_home,
                         "legacy_institution": include_legacy_institution}}


def seed_activities(engine: Engine):
    """Insert only absent natural keys, preserving every existing title/config."""
    with engine.begin() as connection:
        activity_id = connection.execute(select(Activity.id).where(Activity.slug == "rock-paper-scissors")).scalar_one_or_none()
        if activity_id is None:
            activity_id = str(uuid5(NAMESPACE_URL, "pikipick/activity/rock-paper-scissors"))
            connection.execute(Activity.__table__.insert().values(
                id=activity_id, slug="rock-paper-scissors", title="피키와 가위바위보",
                description="이기기·지기·비기기 놀이", is_active=True, created_at=utcnow()))
        version_id = connection.execute(select(ActivityVersion.id).where(
            ActivityVersion.activity_id == activity_id, ActivityVersion.version == "1.0.0")).scalar_one_or_none()
        if version_id is None:
            connection.execute(ActivityVersion.__table__.insert().values(
                id=str(uuid5(NAMESPACE_URL, "pikipick/rock-paper-scissors/1.0.0")),
                activity_id=activity_id, version="1.0.0", is_active=True, created_at=utcnow(),
                config={"modes": ["WIN", "LOSE", "DRAW"],
                        "event_types": ["round_result", "session_ended"], "details_schema_version": 1}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["inspect", "apply"])
    parser.add_argument("--include-lms", action="store_true", help="apply 0002 account/assignment tables")
    parser.add_argument("--include-manager-home", action="store_true", help="apply 0004 approved HOME access tables")
    parser.add_argument("--include-legacy-institution", action="store_true", help="apply legacy 0003 institution tables")
    args = parser.parse_args()
    database = Database()
    try:
        database.check_connection()
        engine = database.require_engine()
        print("Existing tables and column names:", inventory(engine))
        if args.command == "apply":
            print(apply_migrations(engine, include_lms=args.include_lms,
                                   include_manager_home=args.include_manager_home,
                                   include_legacy_institution=args.include_legacy_institution))
            seed_activities(engine)
            print("Missing activity/version seeds inserted; existing data preserved.")
        return 0
    except SchemaConflict as error:
        print("SCHEMA_CONFLICT:", error)
        return 2
    except (ConfigurationError, SQLAlchemyError, OSError) as error:
        log_failure(error)
        print("DB_NOT_READY:", failure_category(error))
        return 2
    finally:
        database.close()


if __name__ == "__main__":
    sys.exit(main())
