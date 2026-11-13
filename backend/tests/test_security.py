from pathlib import Path
import ssl
import unittest
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import IntegrityError, OperationalError

from backend.database import Database
from backend.migrate import apply_migrations, journal, SchemaConflict
from backend.models import PlaySession, utcnow
from backend.settings import Settings
from backend.tests.test_api import LiveApi, sqlite_database


class SecurityTests(unittest.TestCase):
    def test_tls_verifies_identity_and_url_preserves_special_password_characters(self):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        settings = Settings(db_host="example.invalid", db_user="application-user",
            db_password="test-only:p@ss/word#?%", db_ssl_ca=str(Path("backend/.env.example").resolve()))
        with patch("backend.database.ssl.create_default_context", return_value=context) as make_context, \
             patch("backend.database.create_engine") as make_engine:
            database = Database(settings)
            self.assertIsNotNone(database.engine)
            self.assertTrue(context.check_hostname)
            self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
            self.assertEqual(context.minimum_version, ssl.TLSVersion.TLSv1_2)
            self.assertEqual(make_engine.call_args.args[0].password, settings.db_password)
            self.assertNotIn(settings.db_password, str(make_engine.call_args.args[0]))
            self.assertNotIn(settings.db_password, repr(settings))
            self.assertIs(make_engine.call_args.kwargs["connect_args"]["ssl"], context)
            self.assertTrue(make_engine.call_args.kwargs["hide_parameters"])
            make_context.assert_called_once_with(cafile=settings.db_ssl_ca)

    def test_empty_tls_cipher_never_reports_verified(self):
        engine = MagicMock()
        connection = engine.connect.return_value.__enter__.return_value
        connection.dialect.name = "mysql"
        connection.execute.return_value.first.return_value = ("Ssl_cipher", "")
        from backend.settings import ConfigurationError
        with self.assertRaises(ConfigurationError):
            Database(engine=engine).check_connection()

    def test_database_failure_logs_and_response_redact_connection_details(self):
        secret = "NEVER_LOG_THIS_CONNECTION_PASSWORD"
        engine = MagicMock()
        engine.connect.side_effect = OperationalError("mysql+pymysql://user:" + secret,
            {"password": secret}, Exception(1045, secret))
        with self.assertLogs("pikipick.database", level="ERROR") as captured:
            api = LiveApi(Database(engine=engine))
            try:
                status, response = api.request("GET", "/health/db")
                self.assertEqual(status, 503)
                self.assertEqual(response["code"], "authentication_failed")
                self.assertNotIn(secret, str(response))
            finally:
                api.close()
        self.assertNotIn(secret, " ".join(captured.output))

    def test_foreign_keys_and_unknown_migration_are_protected(self):
        database = sqlite_database()
        with self.assertRaises(IntegrityError), database.engine.begin() as connection:
            connection.execute(PlaySession.__table__.insert().values(
                id="missing-parent", client_session_id="missing-parent", activity_version_id="none",
                player_id="none", token_hash="a" * 64, mode="WIN", status="active", details={}, started_at=utcnow()))
        with database.engine.begin() as connection:
            connection.execute(journal.insert().values(version="9999_future", schema_hash="0" * 64, applied_at=utcnow()))
        with self.assertRaises(SchemaConflict):
            apply_migrations(database.engine)
        with database.engine.connect() as connection:
            self.assertEqual(connection.execute(select(journal.c.version)).scalars().all(), ["0001_initial_activities", "9999_future"])
        database.close()

    def test_changed_schema_fingerprint_refuses_a_silent_revision_rewrite(self):
        database = sqlite_database()
        with database.engine.begin() as connection:
            connection.execute(journal.update().values(schema_hash="0" * 64))
        with self.assertRaises(SchemaConflict):
            apply_migrations(database.engine)
        database.close()


if __name__ == "__main__":
    unittest.main()
