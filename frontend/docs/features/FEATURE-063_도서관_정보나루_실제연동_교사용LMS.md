# FEATURE-063 — 도서관 정보나루 실제 연동과 교사용 LMS 조회

## 목적

교사용 데모 LMS에서 누리과정 RAG 근거 검색과 분리된 실제 도서관 정보나루 검색 결과를 조회한다. 인증키는 FastAPI 서버의 `backend/.env`에서만 읽으며, 브라우저와 Git에는 전달하지 않는다.

## 구현

- `TeacherBookSearchPanel`이 `GET /api/books/search`를 호출한다.
- 제목, 저자, 출판사, ISBN, 표지 URL(제공된 경우), 출처만 실제 API 응답에서 표시한다.
- 로딩, 외부 API 오류, 빈 결과를 각각 표시한다.
- 도서 패널은 기존 `TeacherRagPanel`과 함께 표시되며, 누리과정 RAG의 근거 검색 흐름은 변경하지 않는다.
- 정보나루 검색 결과에는 교육적으로 검증된 추천도서가 아니라는 안내를 고정 표시한다.

## 실제 검증

2026-11-20에 `backend/.env`의 키 존재 여부만 확인한 뒤 FastAPI를 재시작해 검증했다. `srchBooks` 검색과 키워드 기반 추천은 HTTP 200 및 실제 도서 3건을 반환했다. 응답에서 제목·저자·출판사·ISBN·표지 URL 등의 제공 필드를 확인했다.

`loanItemSrch`는 HTTP 200으로 정상 인증·호출되었으나, 6세·최근 1년 조건에서는 0건을 반환했다. 빈 결과는 API 오류와 다르게 처리한다. 키 값은 출력하거나 문서화하지 않았다.

## 검증 명령

```powershell
cd frontend
npm.cmd test -- --run
npm.cmd run build
cd ..
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

브라우저에서 `http://localhost:5173/teacher/demo/child`를 열고, 하단의 **도서관 정보나루 실제 도서 조회**에서 주제를 입력해 확인한다. FastAPI는 `http://localhost:8000`에서 실행해야 한다.

## 제한과 다음 작업

- 실제 교사 로그인 및 실제 아동 기록은 이 데모 화면과 연결하지 않는다.
- 정보나루 결과는 검색 결과이며 교육 전문가가 검증한 추천 목록이 아니다.
- API 오류가 나도 누리과정 RAG와 기존 게임·기록 저장은 계속 동작해야 한다.
