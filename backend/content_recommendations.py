"""Deterministic recommendations based on recorded content history."""
from collections.abc import Iterable

from .content_catalog import CONTENTS, get_content


def recommend_from_history(activity_slugs: Iterable[str]) -> dict[str, object]:
    """Never offer a planned activity as an executable recommendation."""
    history = [slug for slug in activity_slugs if get_content(slug) is not None]
    if not history:
        return {"next_activities": [], "book_topic": None, "reason": "No recorded activity yet"}
    experienced = set(history)
    next_playable = [content for content in CONTENTS
                     if content.status == "PLAYABLE" and content.slug not in experienced]
    last = get_content(history[0])
    return {"next_activities": [{"slug": content.slug, "title": content.title,
                                  "reason": "Implemented activity not recorded yet"}
                                 for content in next_playable],
            "book_topic": last.book_topic if last else None,
            "reason": "Based on the most recent recorded activity; not an ability judgement"}
