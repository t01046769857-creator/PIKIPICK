"""Create a non-destructive SQL backup through the configured TLS DB connection."""
from __future__ import annotations

import argparse
from datetime import date, datetime, time
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.engine import Connection
from sqlalchemy.exc import SQLAlchemyError

from .database import Database, failure_category, log_failure
from .settings import ConfigurationError


NAME = re.compile(r"^[A-Za-z0-9_]+$")


def quote_identifier(value: str) -> str:
    if not NAME.fullmatch(value):
        raise ValueError("Unexpected SQL identifier")
    return f"`{value}`"


def sql_literal(value: Any) -> str:
    if value is None: return "NULL"
    if isinstance(value, bool): return "1" if value else "0"
    if isinstance(value, int): return str(value)
    if isinstance(value, float):
        if not math.isfinite(value): raise ValueError("Non-finite values cannot be exported")
        return repr(value)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    if isinstance(value, bytes): return "X'" + value.hex() + "'"
    if isinstance(value, datetime): value = value.isoformat(sep=" ", timespec="microseconds")
    elif isinstance(value, (date, time)): value = value.isoformat()
    if not isinstance(value, str): value = str(value)
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("\x00", "\\0") + "'"


def dump(connection: Connection, output: Path) -> dict[str, Any]:
    tables = sorted(inspect(connection).get_table_names())
    if not tables: raise RuntimeError("Source database has no tables")
    row_counts: dict[str, int] = {}
    with output.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write("-- PIKIPICK logical backup. Credentials are never included.\n")
        stream.write("-- Restore only into an empty, isolated target.\n\n")
        # TiDB can return tables in an order that is not a foreign-key creation
        # order. Restore disables checks only for this isolated import, then
        # re-enables them so integrity can be verified afterwards.
        stream.write("SET FOREIGN_KEY_CHECKS=0;\n\n")
        for table in tables:
            create = connection.exec_driver_sql(f"SHOW CREATE TABLE {quote_identifier(table)}").first()
            if create is None or len(create) < 2: raise RuntimeError(f"Cannot read schema for {table}")
            stream.write(str(create[1]).rstrip() + ";\n\n")
        for table in tables:
            quoted = quote_identifier(table)
            result = connection.exec_driver_sql(f"SELECT * FROM {quoted}")
            columns, count = list(result.keys()), 0
            for row in result.mappings():
                values = ", ".join(sql_literal(row[column]) for column in columns)
                stream.write(f"INSERT INTO {quoted} ({', '.join(quote_identifier(column) for column in columns)}) VALUES ({values});\n")
                count += 1
            stream.write("\n")
            row_counts[table] = count
        stream.write("SET FOREIGN_KEY_CHECKS=1;\n")
    return {"format": "pikipick-logical-sql-v1", "tables": tables, "row_counts": row_counts,
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "size_bytes": output.stat().st_size}


def create_backup(output: Path) -> dict[str, Any]:
    output = output.resolve()
    if output.exists(): raise FileExistsError("Refusing to overwrite an existing backup")
    output.parent.mkdir(parents=True, exist_ok=True)
    database, temporary = Database(), None
    try:
        database.check_connection()
        with database.require_engine().connect() as connection:
            connection.exec_driver_sql("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            connection.exec_driver_sql("START TRANSACTION WITH CONSISTENT SNAPSHOT")
            try:
                with tempfile.NamedTemporaryFile(prefix="pikipick-backup-", suffix=".sql", dir=output.parent, delete=False) as handle:
                    temporary = Path(handle.name)
                manifest = dump(connection, temporary)
                connection.exec_driver_sql("COMMIT")
            except Exception:
                connection.exec_driver_sql("ROLLBACK")
                raise
        os.replace(temporary, output); temporary = None
        manifest["created_at"] = datetime.now().astimezone().isoformat(); manifest["file"] = output.name
        output.with_suffix(output.suffix + ".manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return manifest
    finally:
        if temporary and temporary.exists(): temporary.unlink()
        database.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        manifest = create_backup(args.output)
        print(json.dumps({key: manifest[key] for key in ("file", "tables", "row_counts", "sha256", "size_bytes")}, ensure_ascii=False))
        return 0
    except (ConfigurationError, SQLAlchemyError, OSError, RuntimeError, ValueError) as error:
        log_failure(error)
        print("BACKUP_FAILED:", failure_category(error) if isinstance(error, SQLAlchemyError) else type(error).__name__)
        return 2


if __name__ == "__main__": sys.exit(main())
