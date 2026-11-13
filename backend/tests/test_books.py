import json
import socket
import threading
import time
import unittest
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen

import uvicorn

from backend.books import (BookApiError, BookItem, BookRecommendationService,
                           Data4LibraryClient, parse_books_xml)
from backend.database import Database
from backend.main import create_app
from backend.settings import Settings


SAMPLE_XML = """<response><docs>
<doc><bookname>가위바위보 규칙 놀이</bookname><authors>놀이 작가</authors><isbn13>9780000000001</isbn13><bookImageURL>https://example.test/cover.jpg</bookImageURL><description>친구와 차례를 지키는 규칙 책</description><publisher>테스트 출판사</publisher><publication_year>2025</publication_year></doc>
</docs></response>""".encode("utf-8")


class FakeGateway:
    def __init__(self, *, error=None):
        self.error = error
        self.search_calls = []

    def search(self, keyword, page, page_size):
        self.search_calls.append((keyword, page, page_size))
        if self.error:
            raise self.error
        if keyword in ("가위바위보", "규칙"):
            return [BookItem(title="가위바위보 규칙 놀이", authors="놀이 작가", isbn="9780000000001",
                             description="친구와 차례를 지키는 규칙 책", source_endpoint="srchBooks")]
        if keyword == "차례":
            return [BookItem(title="차례를 기다려요", isbn="9780000000002", source_endpoint="srchBooks")]
        return []

    def popular(self, age, page, page_size):
        if self.error:
            raise self.error
        return [BookItem(title="인기 대출 책", isbn="9780000000003", ranking=1, loan_count=99,
                         source_endpoint="loanItemSrch", source_kind="popular_loan")]


class LiveBookApi:
    def __init__(self, service):
        self.socket = socket.socket()
        self.socket.bind(("127.0.0.1", 0))
        self.url = f"http://127.0.0.1:{self.socket.getsockname()[1]}"
        database = Database(Settings())
        self.server = uvicorn.Server(uvicorn.Config(create_app(database, service), log_level="critical", access_log=False))
        self.thread = threading.Thread(target=self.server.run, kwargs={"sockets": [self.socket]}, daemon=True)
        self.thread.start()
        for _ in range(100):
            if self.server.started:
                return
            time.sleep(0.02)
        raise RuntimeError("도서 API 테스트 서버를 시작하지 못했습니다.")

    def get(self, path):
        try:
            with urlopen(Request(self.url + path), timeout=10) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            with error:
                return error.code, json.load(error)

    def close(self):
        self.server.should_exit = True
        self.thread.join(timeout=5)
        self.socket.close()


class BookParsingAndRecommendationTests(unittest.TestCase):
    def test_xml_parsing_uses_only_source_fields_and_caches_same_search(self):
        calls = []

        def transport(url, _timeout):
            calls.append(url)
            return SAMPLE_XML

        client = Data4LibraryClient(Settings(data4library_api_key="test-key"), transport=transport)
        first = client.search("규칙", 1, 10)
        second = client.search("규칙", 1, 10)
        self.assertEqual(len(calls), 1)
        self.assertEqual(first, second)
        self.assertEqual(first[0].title, "가위바위보 규칙 놀이")
        self.assertEqual(first[0].isbn, "9780000000001")
        self.assertEqual(first[0].cover_url, "https://example.test/cover.jpg")
        self.assertEqual(parse_qs(urlsplit(calls[0]).query)["keyword"], ["규칙"])
        client.popular(6, 1, 10)
        popular_query = parse_qs(urlsplit(calls[1]).query)
        self.assertEqual(popular_query["from_age"], ["6"])
        self.assertEqual(popular_query["to_age"], ["6"])

    def test_missing_key_and_provider_authentication_are_distinguished(self):
        with self.assertRaisesRegex(BookApiError, "book_api_key_missing"):
            Data4LibraryClient(Settings()).search("숫자")
        with self.assertRaisesRegex(BookApiError, "book_api_authentication_failed"):
            parse_books_xml(b"<response><error>authentication key invalid</error></response>", "srchBooks", "search")

    def test_korean_concepts_weighting_and_isbn_deduplication(self):
        gateway = FakeGateway()
        response = BookRecommendationService(gateway).recommendations("가위바위보", 5, 10)
        self.assertEqual(response["activity"], "rock-paper-scissors")
        self.assertIn("규칙", response["concepts"]["direct"])
        self.assertEqual(len(response["items"]), 2)
        self.assertEqual(response["items"][0]["isbn"], "9780000000001")
        self.assertGreaterEqual(response["items"][0]["relevance_score"], 45)
        self.assertEqual(response["ranking_strategy"], "keyword_weighted")
        self.assertFalse(response["items"][0]["is_popular_loan"])
        self.assertIsNone(response["items"][0]["expert_reviewed"])
        self.assertTrue(any(keyword == "가위바위보" for keyword, _, _ in gateway.search_calls))

    def test_popular_results_are_labeled_separately(self):
        response = BookRecommendationService(FakeGateway()).popular(7, 1, 10)
        self.assertTrue(response["items"][0]["is_popular_loan"])
        self.assertIsNone(response["items"][0]["expert_reviewed"])
        self.assertIn("전문가 검증", response["notice"])


class BookEndpointTests(unittest.TestCase):
    def setUp(self):
        self.api = LiveBookApi(BookRecommendationService(FakeGateway()))

    def tearDown(self):
        self.api.close()

    def test_search_popular_recommendations_and_age_validation(self):
        status, search = self.api.get("/api/books/search?keyword=%EA%B7%9C%EC%B9%99&age=5")
        self.assertEqual(status, 200)
        self.assertEqual(search["items"][0]["source"], "도서관 정보나루")
        status, popular = self.api.get("/api/books/popular?age=7")
        self.assertEqual(status, 200)
        self.assertTrue(popular["items"][0]["is_popular_loan"])
        status, recommendations = self.api.get("/api/books/recommendations?activity=%EA%B0%80%EC%9C%84%EB%B0%94%EC%9C%84%EB%B3%B4&age=6")
        self.assertEqual(status, 200)
        self.assertEqual(recommendations["activity"], "rock-paper-scissors")
        self.assertEqual(self.api.get("/api/books/recommendations?activity=unknown&age=5")[0], 422)
        self.assertEqual(self.api.get("/api/books/search?keyword=%EC%88%AB%EC%9E%90&age=4")[0], 422)

    def test_external_error_is_safe_and_does_not_touch_game_api(self):
        self.api.close()
        self.api = LiveBookApi(BookRecommendationService(FakeGateway(error=BookApiError("book_api_timeout"))))
        status, error = self.api.get("/api/books/search?keyword=%EC%88%AB%EC%9E%90")
        self.assertEqual(status, 503)
        self.assertEqual(error["code"], "book_api_timeout")
        self.assertNotIn("test-key", json.dumps(error))
        self.assertEqual(self.api.get("/health")[0], 200)


if __name__ == "__main__":
    unittest.main()
