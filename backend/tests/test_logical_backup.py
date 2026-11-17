import unittest

from backend.logical_backup import quote_identifier, sql_literal


class LogicalBackupTests(unittest.TestCase):
    def test_literals_are_sql_escaped_without_logging_source_values(self):
        self.assertEqual(sql_literal(None), "NULL")
        self.assertEqual(sql_literal(True), "1")
        self.assertEqual(sql_literal({"a": "b"}), "'{\"a\":\"b\"}'")
        self.assertEqual(sql_literal("a'b\\c"), "'a\\'b\\\\c'")

    def test_identifier_rejects_sql_syntax(self):
        self.assertEqual(quote_identifier("play_events"), "`play_events`")
        with self.assertRaises(ValueError):
            quote_identifier("events; DROP TABLE players")
