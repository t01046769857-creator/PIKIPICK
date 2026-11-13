"""Explicit, additive migrations. No DROP, TRUNCATE, DELETE or data updates."""
import argparse
import hashlib
import json
import logging
import sys
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import Boolean, Column, DateTime, Integer, MetaData, String, Table, inspect, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from .database import Database, failure_category, log_failure
from .models import Activity, ActivityVersion, Base, utcnow
from .settings import ConfigurationError

REVISION = "0001_initial_activities"
journal = Table("schema_migrations", MetaData(),
                Column("version", String(64), primary_key=True),
                Column("schema_hash", String(64), nullable=False),
                Column("applied_at", DateTime, nullable=False))


class SchemaConflict(Exception):
    pass


def schema_fingerprint():
    shape = {}
    for table in Base.metadata.sorted_tables:
        shape[table.name] = {
            "columns": [(c.name, c.type._type_affinity.__name__, getattr(c.type, "length", None), c.nullable, c.primary_key) for c in table.columns],
            "unique": sorted(tuple(c.name for c in item.columns) for item in table.constraints if item.__class__.__name__ == "UniqueConstraint"),
            "indexes": sorted((item.name, tuple(c.name for c in item.columns)) for item in table.indexes),
            "foreign_keys": sorted((c.name, fk.target_fullname) for c in table.columns for fk in c.foreign_keys),
            "checks": sorted(str(item.sqltext) for item in table.constraints if item.__class__.__name__ == "CheckConstraint"),
        }
    return hashlib.sha256(json.dumps(shape, sort_keys=True).encode()).hexdigest()


def inventory(engine: Engine):
    inspector = inspect(engine)
    return {table: [column["name"] for column in inspector.get_columns(table)]
            for table in inspector.get_table_names()}


def assert_compatible(engine: Engine):
    """Refuse collisions before any DDL; never rewrite an existing table."""
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    for table in [journal, *Base.metadata.sorted_tables]:
        if table.name not in existing:
            continue
        columns = {c["name"]: c for c in inspector.get_columns(table.name)}
        if set(columns) != set(table.columns.keys()):
            raise SchemaConflict(f"Existing table {table.name} has a different set of columns")
        for expected in table.columns:
            actual = columns.get(expected.name)
            boolean_as_integer = isinstance(expected.type, Boolean) and actual is not None and isinstance(actual["type"], Integer)
            if actual is None or (actual["type"]._type_affinity is not expected.type._type_affinity and not boolean_as_integer):
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


def apply_migrations(engine: Engine):
    existing = assert_compatible(engine)
    # checkfirst와 검증을 함께 사용해 일부만 반영된 MySQL DDL 이후에도 안전하게 다시 실행할 수 있다.
    journal.create(engine, checkfirst=True)
    fingerprint = schema_fingerprint()
    with engine.connect() as connection:
        revisions = {row.version: row.schema_hash for row in connection.execute(select(journal.c.version, journal.c.schema_hash))}
    if set(revisions) - {REVISION}:
        raise SchemaConflict("Unknown migration revision; do not apply older code to this database")
    if REVISION in revisions and revisions[REVISION] != fingerprint:
        raise SchemaConflict("Schema models changed without a new migration revision")
    for table in Base.metadata.sorted_tables:
        table.create(engine, checkfirst=True)
    with engine.begin() as connection:
        if REVISION not in revisions:
            connection.execute(journal.insert().values(version=REVISION, schema_hash=fingerprint, applied_at=utcnow()))
    return {"revision": REVISION, "created_tables": sorted(set(Base.metadata.tables) - existing)}


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
    args = parser.parse_args()
    database = Database()
    try:
        database.check_connection()
        engine = database.require_engine()
        print("Existing tables and column names:", inventory(engine))
        if args.command == "apply":
            print(apply_migrations(engine))
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
