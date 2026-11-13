from datetime import datetime, timezone
import json
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("details", check_fields=False)
    @classmethod
    def bounded_details(cls, value):
        try:
            encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
        except (ValueError, TypeError, RecursionError):
            raise ValueError("details must contain finite JSON values") from None
        if len(encoded.encode("utf-8")) > 16384:
            raise ValueError("details must not exceed 16 KiB")
        return value


class SessionCreate(ApiInput):
    activity_slug: str = Field(default="rock-paper-scissors", min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    activity_version: str | None = Field(default=None, min_length=1, max_length=32)
    client_session_id: UUID = Field(default_factory=uuid4)
    # 클라이언트가 생성한 권한 토큰으로 응답이 유실된 뒤 재시도해도 같은 요청으로 처리한다.
    session_token: str | None = Field(default=None, min_length=32, max_length=128, repr=False, pattern=r"^[A-Za-z0-9_-]+$")
    player_id: UUID | None = None
    age_band: Literal[5, 6, 7] | None = None
    mode: str | None = Field(default=None, max_length=32)
    details: dict[str, Any] = Field(default_factory=dict)


class EventCreate(ApiInput):
    client_event_id: UUID
    sequence: int = Field(gt=0, le=2147483647, strict=True)
    event_type: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    round_index: int | None = Field(default=None, gt=0, le=2147483647, strict=True)
    success: bool | None = Field(default=None, strict=True)
    score: int | None = Field(default=None, ge=-2147483648, le=2147483647, strict=True)
    duration_ms: int | None = Field(default=None, ge=0, le=2147483647, strict=True)
    occurred_at: datetime
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("occurred_at")
    @classmethod
    def utc_timestamp(cls, value):
        if value.tzinfo is None:
            raise ValueError("occurred_at must include a timezone")
        return value.astimezone(timezone.utc).replace(tzinfo=None)
