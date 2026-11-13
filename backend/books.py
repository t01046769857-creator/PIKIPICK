"""도서관 정보나루 Open API를 이용한 유아 놀이 연계 도서 추천 모듈."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from html import unescape
import re
import time
from typing import Callable, Iterable, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from .settings import Settings


DATA4LIBRARY_BASE_URL = "http://data4library.kr/api"
MAX_PAGE_SIZE = 20
MAX_RECOMMENDATION_QUERIES = 5


class BookApiError(Exception):
    """외부 도서 API에 안전한 오류 코드만 전달한다."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


@dataclass(frozen=True)
class ConceptProfile:
    slug: str
    label: str
    direct: tuple[str, ...]
    adjacent: tuple[str, ...]
    extended: tuple[str, ...]


CONCEPT_PROFILES = {
    "rock-paper-scissors": ConceptProfile(
        slug="rock-paper-scissors", label="가위바위보",
        direct=("가위바위보", "규칙", "차례"),
        adjacent=("승부", "감정"), extended=("협동", "친구"),
    ),
    "finger-count": ConceptProfile(
        slug="finger-count", label="손가락 수 세기",
        direct=("수 세기", "숫자", "하나 둘 셋"),
        adjacent=("수량", "많고 적음", "일대일 대응"), extended=("수 비교", "덧셈", "순서"),
    ),
    "muk-jji-ppa": ConceptProfile(
        slug="muk-jji-ppa", label="묵찌빠",
        direct=("묵찌빠", "가위바위보", "규칙"),
        adjacent=("전략", "차례", "승부"), extended=("친구", "감정", "협동"),
    ),
    "addition": ConceptProfile(
        slug="addition", label="간단한 덧셈",
        direct=("덧셈", "더하기", "숫자"),
        adjacent=("수량", "수 세기", "합"), extended=("수 비교", "문제 해결", "순서"),
    ),
    "pattern": ConceptProfile(
        slug="pattern", label="패턴·순서 놀이",
        direct=("패턴", "규칙 찾기", "순서"),
        adjacent=("반복", "분류", "비교"), extended=("문제 해결", "관찰", "논리"),
    ),
}

ACTIVITY_ALIASES = {
    "가위바위보": "rock-paper-scissors", "rps": "rock-paper-scissors",
    "손가락수세기": "finger-count", "손가락 수 세기": "finger-count", "수세기": "finger-count",
    "묵찌빠": "muk-jji-ppa", "덧셈": "addition", "더하기": "addition",
    "패턴": "pattern", "순서놀이": "pattern", "패턴 놀이": "pattern",
}


@dataclass(frozen=True)
class BookItem:
    title: str
    authors: str | None = None
    isbn: str | None = None
    cover_url: str | None = None
    description: str | None = None
    publisher: str | None = None
    publication_year: str | None = None
    ranking: int | None = None
    loan_count: int | None = None
    source_endpoint: str = ""
    source_kind: str = "search"

    def identity(self):
        if self.isbn:
            return "isbn:" + self.isbn
        return "text:" + "|".join((self.title, self.authors or "")).casefold()

    def as_dict(self):
        return {
            "title": self.title, "authors": self.authors, "isbn": self.isbn,
            "cover_url": self.cover_url, "description": self.description,
            "publisher": self.publisher, "publication_year": self.publication_year,
            "ranking": self.ranking, "loan_count": self.loan_count,
            "source": "도서관 정보나루", "source_endpoint": self.source_endpoint,
            "source_kind": self.source_kind,
            "is_popular_loan": self.source_kind == "popular_loan",
            "expert_reviewed": None,
            "expert_review_status": "source_not_provided",
        }


def _clean(value: str | None):
    if not value:
        return None
    text = re.sub(r"\s+", " ", unescape(value)).strip()
    return text or None


def _value(node, *names: str):
    for name in names:
        child = node.find(name)
        if child is not None:
            value = _clean(child.text)
            if value is not None:
                return value
    return None


def _number(value: str | None):
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None


def parse_books_xml(payload: bytes, source_endpoint: str, source_kind: str) -> list[BookItem]:
    """공식 XML의 알려진 도서 필드만 읽고, 누락값을 추정하지 않는다."""
    try:
        root = ElementTree.fromstring(payload)
    except ElementTree.ParseError as error:
        raise BookApiError("book_api_invalid_response") from error

    error_text = " ".join(filter(None, (_value(root, "error", "errorMsg", "message", "resultMessage"),))).casefold()
    if error_text:
        if any(word in error_text for word in ("auth", "인증", "key", "키")):
            raise BookApiError("book_api_authentication_failed")
        raise BookApiError("book_api_provider_error")

    nodes = root.findall(".//doc") or root.findall(".//book")
    books: list[BookItem] = []
    for node in nodes:
        title = _value(node, "bookname", "bookName", "title")
        if not title:
            continue
        books.append(BookItem(
            title=title,
            authors=_value(node, "authors", "author"),
            isbn=_value(node, "isbn13", "isbn", "isbn10"),
            cover_url=_value(node, "bookImageURL", "bookImageUrl", "imageURL", "imageUrl"),
            description=_value(node, "description", "bookDescription"),
            publisher=_value(node, "publisher"),
            publication_year=_value(node, "publication_year", "publicationYear", "pubYear"),
            ranking=_number(_value(node, "ranking", "rank")),
            loan_count=_number(_value(node, "loan_count", "loanCount")),
            source_endpoint=source_endpoint, source_kind=source_kind,
        ))
    return books


class BookGateway(Protocol):
    def search(self, keyword: str, page: int, page_size: int) -> list[BookItem]: ...
    def popular(self, age: int, page: int, page_size: int) -> list[BookItem]: ...


class RecommendationRanker(Protocol):
    """키워드 가중치·임베딩 등 추천 재정렬 방식을 교체하기 위한 경계이다."""

    name: str

    def score(self, book: BookItem, keyword: str, relation: str,
              profile: ConceptProfile) -> tuple[int, list[str], str]: ...


class KeywordWeightedRanker:
    """초기 버전의 설명 가능한 키워드 가중치 순위기이다."""

    name = "keyword_weighted"
    weights = {"direct": 1.0, "adjacent": 0.65, "extended": 0.4}

    def score(self, book: BookItem, keyword: str, relation: str, profile: ConceptProfile):
        weight = self.weights[relation]
        text = " ".join(filter(None, (book.title, book.authors, book.description))).casefold()
        concepts = profile.direct + profile.adjacent + profile.extended
        related = [concept for concept in concepts if concept.casefold() in text]
        score = round(weight * 50) + (round(weight * 50) if keyword.casefold() in text else 0)
        if related:
            score = min(100, score + 10)
        relation_label = {"direct": "직접", "adjacent": "인접", "extended": "확장"}[relation]
        reason = f"{profile.label} 놀이의 {relation_label} 개념 ‘{keyword}’과 연결되는 검색 결과"
        return score, related or [keyword], reason


class Data4LibraryClient:
    """인증키를 서버 안에만 유지하는 도서관 정보나루 XML 클라이언트."""

    def __init__(self, settings: Settings | None = None, *,
                 transport: Callable[[str, int], bytes] | None = None,
                 now: Callable[[], date] = date.today):
        self.settings = settings or Settings.from_env()
        self.transport = transport or self._request
        self.now = now
        self._cache: dict[tuple[tuple[str, str], ...], tuple[float, list[BookItem]]] = {}

    def _request(self, url: str, timeout: int):
        request = Request(url, headers={"Accept": "application/xml", "User-Agent": "PIKIPICK/0.1"})
        try:
            with urlopen(request, timeout=timeout) as response:
                return response.read()
        except HTTPError as error:
            if error.code in (401, 403):
                raise BookApiError("book_api_authentication_failed") from None
            if error.code == 429:
                raise BookApiError("book_api_rate_limited") from None
            raise BookApiError("book_api_provider_error") from None
        except TimeoutError:
            raise BookApiError("book_api_timeout") from None
        except URLError:
            raise BookApiError("book_api_network_unavailable") from None

    def _fetch(self, endpoint: str, params: dict[str, str], source_kind: str):
        if not self.settings.data4library_api_key:
            raise BookApiError("book_api_key_missing")
        query = {"authKey": self.settings.data4library_api_key, **params}
        cache_key = tuple(sorted((key, value) for key, value in query.items() if key != "authKey")) + (("endpoint", endpoint),)
        cached = self._cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < 300:
            return cached[1]
        url = DATA4LIBRARY_BASE_URL + "/" + endpoint + "?" + urlencode(query)
        books = parse_books_xml(self.transport(url, 5), endpoint, source_kind)
        if len(self._cache) >= 128:
            self._cache.pop(next(iter(self._cache)))
        self._cache[cache_key] = (time.monotonic(), books)
        return books

    def search(self, keyword: str, page: int = 1, page_size: int = 10):
        return self._fetch("srchBooks", {
            "keyword": keyword, "pageNo": str(page), "pageSize": str(page_size),
        }, "search")

    def popular(self, age: int, page: int = 1, page_size: int = 10):
        end = self.now()
        start = end - timedelta(days=365)
        return self._fetch("loanItemSrch", {
            "startDt": start.isoformat(), "endDt": end.isoformat(), "gender": "0",
            "from_age": str(age), "to_age": str(age), "region": "0", "addCode": "0", "kdc": "0",
            "pageNo": str(page), "pageSize": str(page_size),
        }, "popular_loan")


def resolve_activity(activity: str):
    normalized = re.sub(r"\s+", " ", activity.strip().casefold())
    slug = ACTIVITY_ALIASES.get(normalized, normalized)
    if slug not in CONCEPT_PROFILES:
        raise BookApiError("book_activity_not_supported")
    return CONCEPT_PROFILES[slug]


def recommendation_queries(profile: ConceptProfile):
    weighted = [(keyword, "direct", 1.0) for keyword in profile.direct]
    weighted += [(keyword, "adjacent", 0.65) for keyword in profile.adjacent]
    weighted += [(keyword, "extended", 0.4) for keyword in profile.extended]
    return weighted[:MAX_RECOMMENDATION_QUERIES]


@dataclass
class BookRecommendationService:
    gateway: BookGateway
    minimum_score: int = 45
    ranker: RecommendationRanker = field(default_factory=KeywordWeightedRanker)

    def search(self, keyword: str, age: int, page: int, page_size: int):
        return {"items": [book.as_dict() for book in self.gateway.search(keyword, page, page_size)],
                "query": keyword, "age": age, "source": "도서관 정보나루"}

    def popular(self, age: int, page: int, page_size: int):
        return {"items": [book.as_dict() for book in self.gateway.popular(age, page, page_size)],
                "age": age, "source": "도서관 정보나루",
                "notice": "인기대출도서이며 교육 전문가 검증 추천을 의미하지 않습니다."}

    def recommendations(self, activity: str, age: int, limit: int):
        profile = resolve_activity(activity)
        ranked: dict[str, tuple[BookItem, int, list[str], list[str]]] = {}
        for keyword, relation, _weight in recommendation_queries(profile):
            for book in self.gateway.search(keyword, 1, MAX_PAGE_SIZE):
                score, related, reason = self.ranker.score(book, keyword, relation, profile)
                if score < self.minimum_score:
                    continue
                key = book.identity()
                previous = ranked.get(key)
                if previous is None:
                    ranked[key] = (book, score, related or [keyword], [reason])
                else:
                    old_book, old_score, old_concepts, old_reasons = previous
                    ranked[key] = (old_book, max(old_score, score), sorted(set(old_concepts + related + [keyword])), old_reasons + [reason])
        items = []
        for book, score, concepts, reasons in sorted(ranked.values(), key=lambda value: (-value[1], value[0].title))[:limit]:
            item = book.as_dict()
            item.update({"relevance_score": score, "related_concepts": concepts,
                         "recommendation_reason": reasons[0], "recommendation_kind": "keyword_weighted"})
            items.append(item)
        return {"items": items, "activity": profile.slug, "activity_label": profile.label, "age": age,
                "concepts": {"direct": list(profile.direct), "adjacent": list(profile.adjacent), "extended": list(profile.extended)},
                "ranking_strategy": self.ranker.name, "source": "도서관 정보나루",
                "notice": "추천 점수는 놀이 개념 키워드와 API 제공 서지 정보의 가중치 기반 점수이며, 전문가 검증을 의미하지 않습니다."}
