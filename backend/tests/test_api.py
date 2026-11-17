import json
import logging
from pathlib import Path
import socket
import ssl
import threading
import time
import unittest
from datetime import timedelta
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from sqlalchemy import create_engine, event, inspect, select, text
from sqlalchemy.pool import StaticPool
import uvicorn

from backend.database import Database
from backend.main import create_app, hash_password, hash_token
from backend.migrate import apply_migrations, inventory, SchemaConflict, seed_activities
from backend.models import (Activity, ActivityVersion, EnrolledChild, HomeRecordAccessGrant, Institution,
                            InstitutionPlayLease, PlaySession, TeacherAccount, TeacherAuthSession,
                            TeacherChildAssignment, TeacherInstitutionMembership, ManagerAccessAuditLog, utcnow)
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
    apply_migrations(engine, include_lms=True, include_manager_home=True, include_legacy_institution=True)
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

    def test_lxp_catalog_keeps_unbuilt_content_non_executable(self):
        status, catalog = self.api.request("GET", "/api/content-catalog")
        self.assertEqual(status, 200)
        by_id = {content["id"]: content for content in catalog["contents"]}
        self.assertEqual(by_id["RPS"]["status"], "PLAYABLE")
        self.assertEqual(by_id["MUK_JJI_PPA"]["status"], "COMING_SOON")
        self.assertEqual(by_id["MUK_JJI_PPA"]["metric_keys"], [])

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

    def test_manager_can_read_only_explicitly_approved_home_history(self):
        home = self.session()
        with self.database.session_factory() as db:
            stored = db.get(PlaySession, home["id"])
            manager = TeacherAccount(email="manager-test@example.invalid", password_hash=hash_password("safe-test-password"))
            db.add(manager); db.flush()
            db.add(HomeRecordAccessGrant(manager_id=manager.id, player_id=stored.player_id,
                                         approval_reference="test-approval-reference",
                                         approved_at=stored.started_at - timedelta(seconds=1)))
            db.commit()
        _, login = self.api.request("POST", "/api/teacher/auth/login", {
            "email": "manager-test@example.invalid", "password": "safe-test-password"})
        token = login["access_token"]
        status, dashboard = self.api.request("GET", f"/api/manager/children/{stored.player_id}/home-dashboard", token=token)
        self.assertEqual(status, 200, dashboard)
        self.assertEqual(dashboard["scope"], "HOME_PLAY_HISTORY")
        self.assertEqual(dashboard["session_count"], 1)
        self.assertIn("weekday_distribution", dashboard)
        self.assertIn("gesture_distribution", dashboard)
        self.assertEqual(dashboard["metric_evidence"][0]["data_version"], "content-analysis-v1")
        self.assertTrue(dashboard["recommendation_basis"])
        self.assertEqual(self.api.request("GET", f"/api/manager/children/{uuid4()}/home-dashboard", token=token)[0], 404)
        with self.database.session_factory() as db:
            grant = db.scalar(select(HomeRecordAccessGrant).where(HomeRecordAccessGrant.manager_id == manager.id))
            grant.status = "revoked"; grant.revoked_at = utcnow(); db.commit()
        self.assertEqual(self.api.request("GET", f"/api/manager/children/{stored.player_id}/home-dashboard", token=token)[0], 403)
        with self.database.session_factory() as db:
            self.assertEqual(db.query(ManagerAccessAuditLog).count(), 1)

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

    def test_teacher_login_and_assigned_child_dashboard_are_protected(self):
        first = self.session()
        self.assertEqual(self.api.request("POST", f"/api/sessions/{first['id']}/events", self.result(), first["session_token"])[0], 201)
        other_body = {"mode": "DRAW", "client_session_id": str(uuid4()), "session_token": uuid4().hex}
        _, second = self.api.request("POST", "/api/sessions", other_body)
        with self.database.session_factory() as db:
            first_session = db.get(PlaySession, first["id"])
            second_session = db.get(PlaySession, second["id"])
            teacher = TeacherAccount(email="teacher-test@example.invalid", password_hash=hash_password("safe-test-password"))
            db.add(teacher); db.flush()
            db.add(TeacherChildAssignment(teacher_id=teacher.id, player_id=first_session.player_id))
            institution = Institution(name="Test institution")
            db.add(institution); db.flush()
            db.add(TeacherInstitutionMembership(teacher_id=teacher.id, institution_id=institution.id))
            db.add(EnrolledChild(institution_id=institution.id, player_id=first_session.player_id))
            other_institution = Institution(name="Other institution")
            db.add(other_institution); db.flush()
            db.add(TeacherChildAssignment(teacher_id=teacher.id, player_id=second_session.player_id))
            db.add(EnrolledChild(institution_id=other_institution.id, player_id=second_session.player_id))
            db.commit()
        self.assertEqual(self.api.request("GET", "/api/teacher/children")[0], 401)
        self.assertEqual(self.api.request("POST", "/api/teacher/auth/login", {"email": "teacher-test@example.invalid", "password": "wrong-password"})[0], 401)
        status, login = self.api.request("POST", "/api/teacher/auth/login", {"email": "teacher-test@example.invalid", "password": "safe-test-password"})
        self.assertEqual(status, 200, login)
        token = login["access_token"]
        self.assertEqual(self.api.request("POST", f"/api/teacher/children/{second_session.player_id}/institution-play", {}, token=token)[0], 403)
        self.assertEqual(self.api.request("POST", "/api/sessions", {"mode": "WIN", "client_session_id": str(uuid4()),
            "session_token": uuid4().hex, "institution_play_token": "x" * 32})[0], 401)
        status, lease = self.api.request("POST", f"/api/teacher/children/{first_session.player_id}/institution-play", {}, token=token)
        self.assertEqual(status, 200, lease)
        institution_session = {"mode": "WIN", "client_session_id": str(uuid4()), "session_token": uuid4().hex,
                               "institution_play_token": lease["institution_play_token"]}
        status, created = self.api.request("POST", "/api/sessions", institution_session)
        self.assertEqual(status, 201, created)
        self.assertEqual(self.api.request("POST", f"/api/sessions/{created['id']}/events", self.result(), created["session_token"])[0], 201)
        with self.database.session_factory() as db:
            active_lease = db.scalar(select(InstitutionPlayLease).where(InstitutionPlayLease.token_hash == hash_token(lease["institution_play_token"])))
            active_lease.expires_at = utcnow() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.api.request("POST", f"/api/sessions/{created['id']}/events", self.result(2), created["session_token"])[0], 401)
        _, second_lease = self.api.request("POST", f"/api/teacher/children/{first_session.player_id}/institution-play", {}, token=token)
        second_institution_session = {"mode": "WIN", "client_session_id": str(uuid4()), "session_token": uuid4().hex,
                                      "institution_play_token": second_lease["institution_play_token"]}
        self.assertEqual(self.api.request("POST", "/api/sessions", second_institution_session)[0], 201)
        status, children = self.api.request("GET", "/api/teacher/children", token=token)
        self.assertEqual(status, 200, children)
        self.assertCountEqual([child["id"] for child in children["children"]], [first_session.player_id, second_session.player_id])
        status, dashboard = self.api.request("GET", f"/api/teacher/children/{first_session.player_id}/dashboard?days=30", token=token)
        self.assertEqual(status, 200, dashboard)
        self.assertEqual(dashboard["summary"]["attempts"], 1)
        self.assertEqual(dashboard["summary"]["target_choices"], 1)
        self.assertIsNone(dashboard["summary"]["retry_count"])
        self.assertEqual(dashboard["recommendations"][0]["kind"], "rule_variation")
        self.assertEqual(dashboard["content_metrics"][0]["activity_slug"], "rock-paper-scissors")
        self.assertEqual(dashboard["book_recommendation_topic"], "rock-paper-scissors")
        self.assertEqual(self.api.request("GET", f"/api/teacher/children/{second_session.player_id}/dashboard", token=token)[0], 200)
        self.assertEqual(self.api.request("GET", "/api/teacher/children", token="tampered-token")[0], 401)
        with self.database.session_factory() as db:
            auth = db.scalar(select(TeacherAuthSession).where(TeacherAuthSession.token_hash == hash_token(token)))
            auth.expires_at = utcnow() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.api.request("GET", "/api/teacher/children", token=token)[0], 401)
        _, renewed = self.api.request("POST", "/api/teacher/auth/login", {
            "email": "teacher-test@example.invalid", "password": "safe-test-password"})
        renewed_token = renewed["access_token"]
        with self.database.session_factory() as db:
            assignment = db.scalar(select(TeacherChildAssignment).where(
                TeacherChildAssignment.teacher_id == teacher.id,
                TeacherChildAssignment.player_id == first_session.player_id))
            assignment.is_active = False
            db.commit()
        self.assertEqual(self.api.request(
            "GET", f"/api/teacher/children/{first_session.player_id}/dashboard", token=renewed_token)[0], 403)
        with self.database.session_factory() as db:
            active_teacher = db.get(TeacherAccount, teacher.id)
            active_teacher.is_active = False
            db.commit()
        self.assertEqual(self.api.request("GET", "/api/teacher/children", token=renewed_token)[0], 403)


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
        # schema_migrations + five play tables + three LMS + six institution tables
        self.assertEqual(len(inventory(database.engine)), 17)
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
