import logging
import ssl

from sqlalchemy import URL, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from .settings import ConfigurationError, Settings

logger = logging.getLogger("pikipick.database")


def failure_category(error: Exception) -> str:
    # 여기에서는 str(error), repr(error), logger.exception, exc_info를 사용하지 않는다.
    if isinstance(error, ConfigurationError):
        return "configuration_missing_or_invalid"
    original = getattr(error, "orig", error)
    code = original.args[0] if getattr(original, "args", ()) else None
    if isinstance(original, ssl.SSLCertVerificationError) or code == 2026:
        return "tls_verification_failed"
    return {1045: "authentication_failed", 1049: "database_not_found",
            1146: "schema_not_migrated", 2003: "network_unreachable",
            2006: "connection_lost", 2013: "connection_lost"}.get(code, "database_unavailable")


def log_failure(error: Exception):
    logger.error("Database operation failed; category=%s. Check local DB configuration and migration status.", failure_category(error))


class Database:
    def __init__(self, settings: Settings | None = None, *, engine: Engine | None = None):
        self.settings = settings
        self.engine = engine
        self.configuration_error: ConfigurationError | None = None
        if engine is None:
            try:
                self.settings = settings or Settings.from_env()
                ca = self.settings.validate_database()
                context = ssl.create_default_context(cafile=str(ca))
                context.check_hostname = True
                context.verify_mode = ssl.CERT_REQUIRED
                context.minimum_version = ssl.TLSVersion.TLSv1_2
                url = URL.create("mysql+pymysql", username=self.settings.db_user,
                                 password=self.settings.db_password, host=self.settings.db_host,
                                 port=self.settings.db_port, database=self.settings.db_name,
                                 query={"charset": "utf8mb4"})
                self.engine = create_engine(
                    url, connect_args={"ssl": context, "connect_timeout": self.settings.connect_timeout,
                                       "read_timeout": 5, "write_timeout": 5, "local_infile": False},
                    pool_pre_ping=True, pool_recycle=1800, pool_size=5, max_overflow=5,
                    pool_timeout=5, hide_parameters=True, echo=False,
                )
            except (ConfigurationError, OSError, ssl.SSLError, ValueError):
                self.configuration_error = ConfigurationError("Database configuration or CA certificate is incomplete or invalid")
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False) if self.engine else None

    def require_engine(self) -> Engine:
        if self.engine is None:
            raise self.configuration_error or ConfigurationError("Database configuration is missing")
        return self.engine

    def check_connection(self):
        with self.require_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
            tls = False
            if connection.dialect.name == "mysql":
                row = connection.execute(text("SHOW STATUS LIKE 'Ssl_cipher'")).first()
                if not row or not row[1]:
                    raise ConfigurationError("Database did not negotiate TLS")
                tls = True
            return {"status": "ok", "database": connection.dialect.name, "tls_verified": tls}

    def close(self):
        if self.engine:
            self.engine.dispose()
