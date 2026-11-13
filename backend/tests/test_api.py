import json
import logging
from pathlib import Path
import socket
import ssl
import threading
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from sqlalchemy import create_engine, event, inspect, select, text
from sqlalchemy.pool import StaticPool
import uvicorn

from backend.database import Database
from backend.main import create_app
from backend.migrate import apply_migrations, inventory, SchemaConflict, seed_activities
from backend.models import Activity, ActivityVersion
from backend.settings import Settings


class LiveApi:
    def __init__(self, database):
        self.socket = socket.socket()
        self.socket.bind(("127.0.0.1", 0))
        self.url = f"http://127.0.0.1:{self.socket.getsockname()[1]}"
        self.server = uvicorn.Server(uvicorn.Config(create_app(database), log_level="critical", access_log=False))
        self.thread = threading.Thread(target=self.server.run, kwargs={"sockets": [self.socket]}, daemon=True)
        self.thread.start()
        for _ in range(100):
            if self.server.started:
                return
            time.sleep(0.02)
        raise RuntimeError("Test API did not start")

    def request(self, method, path, body=None, token=None, headers=None):
        request_headers = {"Content-Type": "application/json", **(headers or {})}
        if token:
            request_headers["Authorization"] = "Bearer " + token
        request = Request(self.url + path, method=method, headers=request_headers,
                          data=json.dumps(body).encode() if body is not None else None)
        try:
            with urlopen(request, timeout=10) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            with error:
                return error.code, json.load(error)

    def close(self):
        self.server.should_exit = True
        self.thread.join(timeout=5)
        self.socket.close()


def sqlite_database():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")
    apply_migrations(engine)
    seed_activities(engine)
    return Database(engine=engine)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.database = sqlite_database()
        self.api = LiveApi(self.database)
        self.session_body = {"mode": "WIN", "client_session_id": str(uuid4()),
                             "session_token": "test_capability_" + uuid4().hex}

    def tearDown(self):
        self.api.close()

    def session(self):
        status, session = self.api.request("POST", "/api/sessions", self.session_body)
        self.assertEqual(status, 201, session)
        return session

    def result(self, sequence=1):
        return {"client_event_id": str(uuid4()), "sequence": sequence, "event_type": "round_result",
                "round_index": 1, "success": True, "occurred_at": "2026-11-13T10:00:00+09:00",
                "details": {"mode": "WIN", "opponent": "ROCK", "player": "PAPER"}}

    def test_health_and_activity_catalog(self):
        self.assertEqual(self.api.request("GET", "/health")[0], 200)
        status, health = self.api.request("GET", "/health/db")
        self.assertEqual(status, 200)
        self.assertEqual(health["database"], "sqlite")  # TiDB 연결 테스트가 아님을 명시한다.
        self.assertFalse(health["tls_verified"])
        status, catalog = self.api.request("GET", "/api/activities")
        self.assertEqual(status, 200)
        self.assertEqual(catalog["activities"][0]["slug"], "rock-paper-scissors")

    def test_save_read_retry_and_pagination(self):
        session = self.session()
        endpoint = "/api/sessions/" + session["id"]
        result = self.result()
        status, stored = self.api.request("POST", endpoint + "/events", result, session["session_token"])
        self.assertEqual(status, 201, stored)
        status, repeated = self.api.request("POST", endpoint + "/events", result, session["session_token"])
        self.assertEqual(status, 200, repeated)
        self.assertEqual(stored["id"], repeated["id"])
        self.assertEqual(stored["occurred_at"], "2026-11-13T01:00:00+00:00")
        self.assertEqual(self.api.request("POST", endpoint + "/events", self.result(2), session["session_token"])[0], 201)
        status, retrieved = self.api.request("GET", endpoint + "?limit=1", token=session["session_token"])
        self.assertEqual(status, 200)
        self.assertEqual(retrieved["session"]["id"], session["id"])
        self.assertEqual(retrieved["event_count"], 2)
        self.assertTrue(retrieved["has_more"])
        self.assertEqual(retrieved["events"][0]["details"], result["details"])
        self.assertNotIn("token_hash", json.dumps(retrieved))
        status, second = self.api.request("GET", endpoint + "?after_sequence=1", token=session["session_token"])
        self.assertEqual(second["events"][0]["sequence"], 2)

    def test_session_retry_is_idempotent(self):
        original = self.session()
        status, repeated = self.api.request("POST", "/api/sessions", self.session_body)
        self.assertEqual(status, 200)
        self.assertEqual(original["id"], repeated["id"])
        self.session_body["mode"] = "LOSE"
        self.assertEqual(self.api.request("POST", "/api/sessions", self.session_body)[0], 409)

    def test_authorization_validation_and_conflicts(self):
        session = self.session()
        endpoint = "/api/sessions/" + session["id"]
        self.assertEqual(self.api.request("GET", endpoint)[0], 401)
        self.assertEqual(self.api.request("POST", endpoint + "/events", self.result(), "wrong")[0], 401)
        self.assertEqual(self.api.request("GET", "/api/sessions/" + str(uuid4()), token="wrong")[0], 404)
        result = self.result()
        self.assertEqual(self.api.request("POST", endpoint + "/events", result, session["session_token"])[0], 201)
        result["details"]["note"] = "changed"
        self.assertEqual(self.api.request("POST", endpoint + "/events", result, session["session_token"])[0], 409)
        self.assertEqual(self.api.request("POST", endpoint + "/events", self.result(), session["session_token"])[0], 409)
        invalid = self.result(2)
        invalid["success"] = False
        self.assertEqual(self.api.request("POST", endpoint + "/events", invalid, session["session_token"])[0], 422)
        invalid["sequence"] = 0
        self.assertEqual(self.api.request("POST", endpoint + "/events", invalid, session["session_token"])[0], 422)
        invalid["sequence"] = 2
        invalid["details"] = {"note": "a" * 20000}
        self.assertEqual(self.api.request("POST", endpoint + "/events", invalid, session["session_token"])[0], 422)
        secret = "short_secret"
        status, error = self.api.request("POST", "/api/sessions", {"mode": "WIN", "session_token": secret})
        self.assertEqual(status, 422)
        self.assertNotIn(secret, json.dumps(error))

    def test_all_modes_and_gesture_results(self):
        beats = {"ROCK": "SCISSORS", "SCISSORS": "PAPER", "PAPER": "ROCK"}
        for mode in ("WIN", "LOSE", "DRAW"):
            self.session_body = {"mode": mode, "client_session_id": str(uuid4()), "session_token": uuid4().hex}
            session = self.session()
            sequence = 0
            for opponent in beats:
                for player in beats:
                    sequence += 1
                    result = self.result(sequence)
                    result["details"] = {"mode": mode, "opponent": opponent, "player": player}
                    result["success"] = (beats[player] == opponent if mode == "WIN" else beats[opponent] == player if mode == "LOSE" else player == opponent)
                    status, stored = self.api.request("POST", f"/api/sessions/{session['id']}/events", result, session["session_token"])
                    self.assertEqual(status, 201, stored)

    def test_completed_session_and_cors(self):
        session = self.session()
        endpoint = f"/api/sessions/{session['id']}"
        ended = {"client_event_id": str(uuid4()), "sequence": 1, "event_type": "session_ended", "occurred_at": "2026-11-13T00:00:00Z"}
        self.assertEqual(self.api.request("POST", endpoint + "/events", ended, session["session_token"])[0], 201)
        self.assertEqual(self.api.request("POST", endpoint + "/events", self.result(2), session["session_token"])[0], 409)
        status, retrieved = self.api.request("GET", endpoint, token=session["session_token"])
        self.assertEqual(retrieved["session"]["status"], "completed")
        self.assertEqual(self.api.request("POST", endpoint + "/events", ended, session["session_token"])[0], 200)
        request = Request(self.api.url + "/api/sessions", method="OPTIONS", headers={
            "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"})
        with urlopen(request) as response:
            self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")

    def test_another_activity_reuses_the_same_session_and_event_tables(self):
        with self.database.session_factory() as db:
            activity = Activity(slug="finger-count", title="손가락 수 세기")
            db.add(activity); db.flush()
            db.add(ActivityVersion(activity_id=activity.id, version="1.0.0", config={"event_types": ["answer"]}))
            db.commit()
        status, session = self.api.request("POST", "/api/sessions", {"activity_slug": "finger-count"})
        self.assertEqual(status, 201)
        result = {"client_event_id": str(uuid4()), "sequence": 1, "event_type": "answer", "success": True,
                  "occurred_at": "2026-11-13T00:00:00Z", "details": {"target_count": 3, "observed_count": 3}}
        endpoint = f"/api/sessions/{session['id']}"
        self.assertEqual(self.api.request("POST", endpoint + "/events", result, session["session_token"])[0], 201)
        _, retrieved = self.api.request("GET", endpoint, token=session["session_token"])
        self.assertEqual(retrieved["events"][0]["details"], result["details"])


class SafetyTests(unittest.TestCase):
    def test_api_starts_without_database_and_does_not_leak_error(self):
        api = LiveApi(Database(Settings()))
        try:
            self.assertEqual(api.request("GET", "/health")[0], 200)
            self.assertEqual(api.request("GET", "/health/db")[0], 503)
            self.assertEqual(api.request("GET", "/api/activities")[0], 503)
        finally:
            api.close()

    def test_migration_rerun_preserves_existing_activity(self):
        database = sqlite_database()
        with database.engine.begin() as connection:
            connection.execute(Activity.__table__.update().values(title="Preserve existing title"))
        self.assertEqual(apply_migrations(database.engine)["created_tables"], [])
        seed_activities(database.engine)
        with database.engine.connect() as connection:
            self.assertEqual(connection.execute(select(Activity.title)).scalar_one(), "Preserve existing title")
        self.assertEqual(len(inventory(database.engine)), 6)
        database.close()

    def test_schema_collision_refuses_to_modify_existing_table(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE activities (id INTEGER PRIMARY KEY, untouched TEXT)"))
        with self.assertRaises(SchemaConflict):
            apply_migrations(engine)
        self.assertEqual(inspect(engine).get_table_names(), ["activities"])
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
