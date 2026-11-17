import unittest

from backend.content_analysis import calculate_metrics
from backend.content_recommendations import recommend_from_history


class ContentAnalysisTests(unittest.TestCase):
    def test_rps_metrics_use_only_recorded_round_events(self):
        result = calculate_metrics("rock-paper-scissors", [
            {"event_type": "round_result", "success": True},
            {"event_type": "round_result", "success": False},
            {"event_type": "session_ended", "success": None},
        ])
        values = {metric["key"]: metric["value"] for metric in result["metrics"]}
        self.assertEqual(values, {"rule_attempt": 2, "goal_matched_choice": 1, "goal_not_matched_choice": 1})
        self.assertEqual(result["unavailable_metrics"], ["retry"])

    def test_recommendation_never_offers_coming_soon_content(self):
        plan = recommend_from_history(["rock-paper-scissors"])
        self.assertEqual(plan["next_activities"], [])
        self.assertEqual(plan["book_topic"], "rock-paper-scissors")

    def test_empty_history_does_not_infer_preference(self):
        self.assertIsNone(recommend_from_history([])["book_topic"])
