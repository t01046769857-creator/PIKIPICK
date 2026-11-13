# FEATURE-017 — 도서관 정보나루 유아도서 추천 API

- 날짜: 2026-11-13
- 목적: 기존 게임·보상·세션 저장을 바꾸지 않고, 5~7세 놀이 개념과 연결된 도서 검색·인기대출도서·추천 API를 FastAPI에 추가한다.
- 상태: 승인 전 구현 및 mock 기반 검증 완료. 실제 도서관 정보나루 호출은 미검증이다.

## 구현 파일과 범위

- `backend/books.py`: 도서관 정보나루 XML 클라이언트, 5분 메모리 캐시, 놀이 개념 사전, 키워드 가중치 추천기, 추천기 교체 경계를 구현했다.
- `backend/main.py`: `/api/books/search`, `/api/books/popular`, `/api/books/recommendations`를 추가했다. 게임 라우트와 TiDB 모델·마이그레이션은 변경하지 않았다.
- `backend/settings.py`, `backend/.env`, `backend/.env.example`: `DATA4LIBRARY_API_KEY`를 추가했다. 실제 키는 비어 있으며 소스·문서·테스트에 기록하지 않는다.
- `backend/tests/test_books.py`: XML 파싱, 한국어 검색 조건, 5~7세 입력 검증, 추천 점수, ISBN 중복 제거, 오류 처리, Swagger 라우트를 mock으로 검사한다.

## 외부 API와 응답 원칙

공식 [Open API 활용 안내](https://www.data4library.kr/apiUtilization)에서 확인한 `srchBooks`와 `loanItemSrch`만 사용한다. 기본 XML 응답에서 실제로 제공되는 제목·저자·ISBN·표지 URL·소개·출판 정보·순위·대출 횟수만 읽는다. 없는 값은 만들지 않는다.

인기대출도서는 `is_popular_loan=true`으로 표시한다. 정보나루 응답에는 교육 전문가 검증 여부가 없으므로 `expert_reviewed=null`, `expert_review_status=source_not_provided`로 반환한다. 인기대출 순위가 전문가 추천임을 의미하지 않는다.

## 추천 규칙과 RAG 확장 지점

가위바위보는 규칙·차례·승부·감정·협동·친구, 손가락 수 세기는 수 세기·숫자·수량·일대일 대응·수 비교·덧셈·순서를 사용한다. 묵찌빠, 덧셈, 패턴·순서 놀이도 같은 직접·인접·확장 구조로 추가했다.

현재 `KeywordWeightedRanker`는 검색 개념의 단계와 API가 제공한 제목·저자·소개 텍스트를 이용해 0~100 점수를 계산한다. `RecommendationRanker` 프로토콜을 통해 향후 OpenAI Embeddings 또는 LangChain RAG 순위기를 주입할 수 있다. 해당 외부 AI 연동은 구현하지 않았다.

## 오류와 검증

키가 비어 있으면 서버는 외부 호출 없이 `503 book_api_key_missing`을 반환한다. 인증 실패, 호출 제한, 시간 초과, 네트워크 오류, 제공자 오류는 서로 다른 안전한 코드로 반환하며 원본 오류나 키는 응답에 포함하지 않는다. 성공 결과는 메모리에 5분간 캐시한다.

백엔드 전체 테스트 21개가 통과했다. Swagger `/docs`와 세 도서 API 경로가 실제 FastAPI 서버에 표시되는 것을 확인했다. 현재 키가 미입력·승인대기이므로 실제 API 성공, 실제 도서 결과, 일일 호출 한도 동작은 미검증이다.

## 사용자 추가 작업

정보나루 인증키가 승인되면 `backend/.env`의 `DATA4LIBRARY_API_KEY`에만 입력하고 FastAPI를 재시작한다. 이후 `/api/books/search?keyword=숫자&age=5`로 응답 구조·인증·호출 제한을 확인한다. 키를 채팅, `.env.example`, 프론트엔드 환경변수, GitHub에 넣지 않는다.
