"""브라우저 테스트용 명시적 메모리 SQLite fixture이며, 운영 진입점으로 사용하지 않는다."""
from backend.main import create_app
from backend.tests.test_api import sqlite_database

app = create_app(sqlite_database())
