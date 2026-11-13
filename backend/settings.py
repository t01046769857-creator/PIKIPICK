from dataclasses import dataclass, field
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent


class ConfigurationError(Exception):
    """Contains safe variable names only, never their values."""


@dataclass(frozen=True)
class Settings:
    db_host: str = ""
    db_port: int = 4000
    db_user: str = ""
    db_password: str = field(default="", repr=False)
    db_name: str = "pikipick"
    db_ssl_ca: str = ""
    connect_timeout: int = 5
    data4library_api_key: str = field(default="", repr=False)
    cors_origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")

    @classmethod
    def from_env(cls):
        load_dotenv(BACKEND_DIR / ".env", override=False)
        try:
            port = int(os.getenv("DB_PORT", "4000"))
            timeout = int(os.getenv("DB_CONNECT_TIMEOUT", "5"))
        except ValueError:
            raise ConfigurationError("DB_PORT and DB_CONNECT_TIMEOUT must be integers") from None
        if not 1 <= port <= 65535 or not 1 <= timeout <= 30:
            raise ConfigurationError("DB_PORT or DB_CONNECT_TIMEOUT is out of range")
        return cls(
            db_host=os.getenv("DB_HOST", "").strip(), db_port=port,
            db_user=os.getenv("DB_USER", "").strip(),
            db_password=os.getenv("DB_PASSWORD", ""),
            db_name=os.getenv("DB_NAME", "pikipick").strip(),
            db_ssl_ca=os.getenv("DB_SSL_CA", "").strip(), connect_timeout=timeout,
            data4library_api_key=os.getenv("DATA4LIBRARY_API_KEY", "").strip(),
            cors_origins=tuple(x.strip() for x in os.getenv(
                "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ).split(",") if x.strip()),
        )

    def validate_database(self):
        values = {"DB_HOST": self.db_host, "DB_USER": self.db_user,
                  "DB_PASSWORD": self.db_password, "DB_NAME": self.db_name,
                  "DB_SSL_CA": self.db_ssl_ca}
        missing = [key for key, value in values.items() if not value]
        if missing:
            raise ConfigurationError("Missing environment variables: " + ", ".join(missing))
        ca = Path(self.db_ssl_ca).expanduser()
        if not ca.is_absolute():
            ca = BACKEND_DIR / ca
        if not ca.is_file():
            raise ConfigurationError("DB_SSL_CA must point to an existing CA certificate file")
        return ca
