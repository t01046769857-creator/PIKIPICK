"""Content-specific, explainable calculations over raw play events."""
from collections.abc import Iterable
from typing import Any

from .content_catalog import get_content


def _event_value(event: Any, name: str):
    return event.get(name) if isinstance(event, dict) else getattr(event, name)


def calculate_metrics(activity_slug: str, events: Iterable[Any]) -> dict[str, object]:
    """Calculate only metrics supported by the recorded event schema."""
    content = get_content(activity_slug)
    materialized = list(events)
    if content is None:
        return {"activity_slug": activity_slug, "metrics": [], "unsupported": True}
    if activity_slug == "rock-paper-scissors":
        rounds = [event for event in materialized if _event_value(event, "event_type") == "round_result"]
        matched = sum(_event_value(event, "success") is True for event in rounds)
        missed = sum(_event_value(event, "success") is False for event in rounds)
        return {"activity_slug": activity_slug, "metrics": [
            {"key": "rule_attempt", "value": len(rounds), "definition": "Recorded round_result events"},
            {"key": "goal_matched_choice", "value": matched,
             "definition": "round_result events where success is true"},
            {"key": "goal_not_matched_choice", "value": missed,
             "definition": "round_result events where success is false"},
        ], "unsupported": False, "unavailable_metrics": ["retry"]}
    return {"activity_slug": activity_slug, "metrics": [], "unsupported": False,
            "unavailable_metrics": list(content.metric_keys)}
