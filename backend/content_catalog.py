"""Static content contracts shared by the LXP API.

The database remains the source of truth for which activity versions are
published. This module holds product contracts only, so analytics do not treat
rock-paper-scissors outcomes as universal child metrics.
"""
from dataclasses import dataclass
from typing import Literal


ContentStatus = Literal["PLAYABLE", "COMING_SOON"]


@dataclass(frozen=True)
class ContentDefinition:
    slug: str
    client_id: str
    title: str
    status: ContentStatus
    event_types: tuple[str, ...]
    metric_keys: tuple[str, ...]
    book_topic: str | None


CONTENTS: tuple[ContentDefinition, ...] = (
    ContentDefinition("rock-paper-scissors", "RPS", "피키와 가위바위보", "PLAYABLE",
                      ("round_result", "session_ended"),
                      ("participation", "rule_attempt", "goal_matched_choice", "retry"),
                      "rock-paper-scissors"),
    # Discoverable only: no API or UI declares these executable until their
    # own runner, version, validator and metrics are implemented.
    ContentDefinition("muk-jji-ppa", "MUK_JJI_PPA", "묵찌빠", "COMING_SOON", (), (), "muk-jji-ppa"),
    ContentDefinition("finger-count", "FINGER_COUNT", "손가락 수 세기", "COMING_SOON", (), (), "finger-count"),
    ContentDefinition("number-play", "NUMBER", "숫자 놀이", "COMING_SOON", (), (), "addition"),
    ContentDefinition("pattern-order", "PATTERN", "패턴·순서 놀이", "COMING_SOON", (), (), "pattern"),
    ContentDefinition("picture-book", "PICTURE_BOOK", "그림책 놀이", "COMING_SOON", (), (), None),
)


def get_content(slug: str) -> ContentDefinition | None:
    return next((content for content in CONTENTS if content.slug == slug), None)


def public_catalog() -> list[dict[str, object]]:
    return [{"id": content.client_id, "slug": content.slug, "title": content.title,
             "status": content.status, "metric_keys": list(content.metric_keys),
             "book_topic": content.book_topic} for content in CONTENTS]
