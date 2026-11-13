# PIKIPICK FastAPI + TiDB Cloud

구현일: 2026-11-13. 기존 게임 판정·UI·로컬 별 기록을 유지하면서 놀이 세션과 결과를 API로 기록한다.

**현재 실제 TiDB 상태:** 2026-11-13에 실제 TiDB Cloud 연결과 TLS 서버 신원 검증을 확인했다. 기존 스키마는 비어 있었고, 안전 마이그레이션으로 공통 테이블 5개와 마이그레이션 이력 테이블을 생성했다. API와 실제 브라우저 게임을 통해 세 모드의 세션·결과·종료 기록, 오프라인 재전송을 검증했다. 비밀번호·접속 문자열·세션 토큰은 기록하지 않는다. SQLite는 운영 DB 장애 시 사용하는 대체 저장소가 아니다.

## 실제 기술 스택과 연결 구조

- 프론트엔드: React, TypeScript, Vite 8.3.6
- 백엔드: Python, FastAPI 0.162.5, Uvicorn 0.54.0
- 데이터: SQLAlchemy 2.1.8, PyMySQL 1.2.4, TiDB Cloud Starter(MySQL 호환)
- 보안 연결: `python-dotenv`, `cryptography`, CA 검증·호스트명 검증·TLS 1.2 이상

브라우저는 `VITE_API_BASE_URL`의 FastAPI만 호출하고, FastAPI가 TLS 검증을 적용한 TiDB Cloud에 연결한다. 브라우저가 TiDB에 직접 연결하지 않으며, DB 비밀번호는 프론트엔드 변수나 응답에 포함하지 않는다.

## 실행 — 프로젝트 루트의 PowerShell

가상환경은 기존 `backend/.venv`를 그대로 사용한다. 필요한 패키지는 이미 설치되어 있었으며 확인한 버전을 `requirements.txt`에 기록했다.

```powershell
# 필요할 때만 의존성 설치
& ./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt

# API 시작: DB가 준비되지 않아도 서버는 시작한다.
& ./backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

문서 UI는 `http://localhost:8000/docs`, API 상태는 `/health`, 실제 연결 상태는 `/health/db`다. API 시작 시 DDL·seed를 자동 실행하지 않는다. `.env` 수정 후에는 API를 재시작한다.

별도 PowerShell에서 프론트엔드를 실행한다. 기본 API 주소는 `http://localhost:8000`이며 공개 설정 `VITE_API_BASE_URL`로 바꿀 수 있다.

```powershell
& 'C:/Program Files/nodejs/npm.cmd' --prefix frontend run dev -- --host localhost --port 5173
```

## 4층 PC·6층 PC·집 노트북에서 실행

세 PC 모두 같은 절차로 실행한다. 각 PC는 저장소를 받고 Node.js와 Python을 설치한 뒤, 프론트엔드 의존성과 `backend/.venv` 의존성을 설치한다. `backend/.env.example`을 `backend/.env`로 복사하고 **각 PC의 로컬 CA 파일 경로**와 TiDB 접속 값을 넣는다. `.env.example`에는 실제 값이 들어 있지 않으며, 실제 `.env`는 공유하거나 Git에 올리지 않는다.

각 PC에서 기본 개발 방식으로 FastAPI(`127.0.0.1:8000`)와 Vite(`localhost:5173`)를 함께 실행하면 된다. 이 방식은 해당 PC의 브라우저와 API만 연결한다. 다른 PC의 브라우저가 한 PC의 FastAPI를 사용하게 하는 운영 방식은 아직 구성하지 않았다. 필요할 경우 별도 배포 환경에서 HTTPS, 방화벽, 정확한 프론트엔드 Origin만 담은 `CORS_ORIGINS`, 공개 API 주소를 함께 설정한 뒤 검증해야 한다. 개발 서버를 임의로 인터넷에 노출하지 않는다.

## 사용자가 입력할 로컬 설정

`backend/.env`는 실제 접속 정보와 CA 경로를 담는 로컬 비밀 파일이며 Git에서 제외된다. `backend/.env.example`은 변수 이름과 `YOUR_TIDB_HOST`, `YOUR_DB_USER`, 빈 `DB_PASSWORD` 같은 안전한 자리표시자만 담는 공유용 템플릿이다. 기존 `.env`가 있었다면 덮어쓰지 않는 원칙이며, 이번 작업 시작 시에는 파일이 없었다.

| 변수 | 입력 내용 |
|---|---|
| `DB_HOST` | TiDB Cloud Connect 화면의 정확한 공용 호스트명. 클러스터 이름 `pikipick-db`와 구분 |
| `DB_PORT` | `4000` |
| `DB_USER` | TiDB 연결 화면에서 제공한 전체 사용자명 |
| `DB_PASSWORD` | 해당 사용자의 비밀번호. 이 로컬 파일에만 입력 |
| `DB_NAME` | `pikipick` |
| `DB_SSL_CA` | TiDB가 안내하는 CA 인증서 파일 경로 |
| `DB_CONNECT_TIMEOUT` | 기본 5초, 허용 1~30초 |
| `DATA4LIBRARY_API_KEY` | 도서관 정보나루에서 승인된 Open API 키. `backend/.env`에만 입력 |
| `CORS_ORIGINS` | 기본 `http://localhost:5173,http://127.0.0.1:5173` |

Windows 경로는 `C:/Users/.../ca.pem`처럼 슬래시를 사용한다. 상대 경로는 `backend/` 기준이다. 예를 들어 인증서를 직접 `backend/certs/`에 보관하고 경로를 지정할 수 있다. 인증서 파일을 이번 작업에서 생성하거나 내려받지는 않았다. 비밀번호에 `#`, 공백 등이 있으면 `.env`에서 작은따옴표로 감싼다. 접속 정보를 프론트엔드 `VITE_` 변수에 넣으면 안 된다.

DB 연결은 SQLAlchemy `URL.create`로 만들므로 비밀번호의 `@`, `/`, `%` 등을 수동 URL 인코딩할 필요가 없다. PyMySQL에 Python `SSLContext`를 직접 전달하고 CA 검증, `CERT_REQUIRED`, `check_hostname=True`, TLS 1.2 이상을 강제한다. 연결 후에는 TLS cipher 협상 여부도 확인한다. CA를 읽을 수 없거나 인증이 실패하면 비검증 연결로 우회하지 않는다.

로그와 API 오류에는 정해진 오류 분류만 남기고 원본 드라이버 메시지·SQL 인자·비밀번호·연결 문자열은 출력하지 않는다. 검증 오류에서도 입력 값/토큰을 다시 노출하지 않는다.

## 기존 테이블 확인과 마이그레이션

접속 설정 후 아래 순서로 실행한다.

```powershell
# SELECT 1 및 TLS 확인 후 현재 테이블·컬럼 이름만 조사한다.
& ./backend/.venv/Scripts/python.exe -m backend.migrate inspect

# 호환성 검사 후 없는 테이블과 없는 기본 놀이만 추가한다.
& ./backend/.venv/Scripts/python.exe -m backend.migrate apply
```

`apply`는 테이블·컬럼 타입/길이/nullability·PK·FK·고유 제약·인덱스를 먼저 검사한다. 동일 이름의 비호환 테이블이 있으면 변경 전에 중단한다. 기존 데이터/제목/config를 갱신하거나 지우지 않는다. MySQL DDL의 부분 완료 상태에서도 재실행할 수 있도록 테이블별 checkfirst를 사용한다. 동시에 여러 마이그레이션 프로세스를 실행하지 않는다.

`schema_migrations`에 버전 `0001_initial_activities`와 스키마 지문을 기록한다. 재실행은 데이터를 보존하며, 알 수 없는 미래 버전이나 같은 버전의 모델 변경이 감지되면 중단한다. 후속 스키마 변경 시 새 버전의 명시적 전진 마이그레이션을 추가해야 한다. 현재 마이그레이션에는 DROP/TRUNCATE/DELETE 및 기존 데이터 UPDATE가 없다.

기본 seed는 활성 놀이 `rock-paper-scissors`와 버전 `1.0.0`이다. 묵찌빠·수 세기·덧셈·패턴 놀이는 실제 구현 전까지 활성 놀이로 등록하지 않는다.

## 공통 데이터 모델

| 테이블 | 주요 정보와 제약 |
|---|---|
| `activities` | UUID PK, 고유 slug, 제목·설명·활성 여부 |
| `activity_versions` | 놀이 FK, 놀이별 고유 version, 허용 모드·이벤트 등 JSON config |
| `players` | 익명 UUID PK, 선택적인 5/6/7세 연령대, locale. 이름/생년월일 없음 |
| `play_sessions` | 버전/플레이어 FK, 고유 client_session_id, 토큰 SHA-256, 모드·상태·시작/종료·세션 JSON |
| `play_events` | 세션 FK, 세션별 고유 client_event_id와 sequence, 공통 성공/점수/시간·라운드 필드 및 게임별 JSON details |

플레이어/시작 시각, 버전/시작 시각, 세션/발생 시각, 이벤트 종류/수신 시각에 인덱스를 둔다. 도메인 테이블 5개 외에 마이그레이션 이력 테이블 1개를 사용한다. 필수성·UUID·숫자 범위·연령대·JSON 크기·이벤트 스키마는 API에서 검증하며 DB에 PK/FK/UNIQUE/CHECK도 선언한다. TiDB 버전/설정에 따른 CHECK 활성 여부는 실제 연결 시 추가 확인해야 한다. API 검증은 DB CHECK 설정에 의존하지 않는다.

공통 필드는 세션·순서·시간·성공·점수다. 게임별 입력은 `details` JSON에 넣고 버전 config와 해당 놀이 검증기로 확인한다. 현재 가위바위보 기록은 모드·아이 손·피키 손·성공 값의 일치도 검사한다. 이 검사는 잘못된 기록 수신을 거절하는 용도이며 프론트엔드 판정 함수를 변경하거나 별을 계산하지 않는다. 수 세기 예제가 새 테이블 없이 같은 API로 저장되는 테스트도 포함한다.

## API

| 메서드·경로 | 동작 |
|---|---|
| `GET /health` | API 프로세스 상태. DB 장애와 독립 |
| `GET /health/db` | 실제 SELECT 1/TLS 검사. 장애·설정 누락은 503 |
| `GET /api/activities` | 활성 놀이와 활성 버전·config |
| `POST /api/sessions` | 익명 플레이어와 세션 생성. 재전송 식별자 지원 |
| `POST /api/sessions/{id}/events` | 결과 또는 종료 이벤트 저장. 같은 이벤트 재전송은 중복 삽입 없이 200 |
| `GET /api/sessions/{id}` | 세션과 순서별 기록. `after_sequence`, `limit`(최대 500) 페이지네이션 |
| `GET /api/books/search` | 도서관 정보나루 도서 검색. `keyword`, 5~7세 `age`, `page`, `limit` |
| `GET /api/books/popular` | 해당 연령의 인기대출도서. `age`, `page`, `limit` |
| `GET /api/books/recommendations` | 놀이 개념 기반 도서 추천. `activity`, 5~7세 `age`, `limit` |

새 세션/이벤트는 201, 동일 내용 재시도는 200, 없는 자원은 404, 잘못된 토큰은 401, 내용/순서 충돌은 409, 검증 실패는 422, DB 미준비/장애는 503이다.

세션 요청 예시(표시된 UUID는 형식 예시이며 비밀 값이 아님):

```json
{"activity_slug":"rock-paper-scissors","activity_version":"1.0.0","mode":"WIN","client_session_id":"11111111-1111-4111-8111-111111111111"}
```

응답의 `id`, `session_token`을 이용한다. 이벤트 저장·조회에는 `Authorization: Bearer <session_token>`이 필요하다. 브라우저는 응답 유실에도 같은 요청을 재시도할 수 있도록 `session_token`을 안전한 난수로 미리 생성해 세션 생성 요청에 포함한다. DB에는 해시만 저장한다. 토큰을 로그·문서·URL에 기록하지 않는다.

이벤트 예시:

```json
{"client_event_id":"22222222-2222-4222-8222-222222222222","sequence":1,"event_type":"round_result","round_index":1,"success":true,"occurred_at":"2026-11-13T16:00:00+09:00","details":{"mode":"WIN","player":"PAPER","opponent":"ROCK"}}
```

서버는 UTC로 저장/응답한다. `session_ended` 이벤트로 세션을 completed로 바꾸며 완료된 세션에 새 결과를 추가하지 않는다. 재시도 시 동일 client_event_id와 내용을 그대로 사용한다. 이벤트 details는 16KiB, 요청 본문은 32KiB로 제한한다.

## 도서관 정보나루 유아도서 추천

도서 검색은 공식 `srchBooks`, 인기대출도서는 공식 `loanItemSrch`만 호출한다. 공식 활용 안내에 따라 서버가 `authKey`, 검색어 또는 기간·성별·연령·페이지 조건을 XML API에 전달한다. 브라우저는 인증키를 전달하거나 외부 API를 직접 호출하지 않는다. [도서관 정보나루 Open API 활용 안내](https://www.data4library.kr/apiUtilization)를 기준으로 구현했다.

`/api/books/recommendations`는 가위바위보, 손가락 수 세기, 묵찌빠, 덧셈, 패턴·순서 놀이의 직접·인접·확장 개념을 한국어 검색어로 구성한다. 현재는 `KeywordWeightedRanker`가 제목·저자·도서소개와 검색 개념의 일치도에 가중치를 주고 ISBN을 우선 기준으로 중복을 제거한다. `RecommendationRanker` 경계에 임베딩 또는 RAG 재정렬기를 주입할 수 있지만, OpenAI Embeddings·LangChain은 아직 연결하지 않았다.

반환값의 `is_popular_loan=true`은 인기대출도서 API 결과임을 뜻한다. `expert_reviewed`는 출처에서 제공하지 않으므로 `null`이며, 인기대출도서를 전문가 검증 추천으로 표시하지 않는다. 제목·ISBN·소개·표지는 외부 XML에 실제로 제공된 필드만 반환한다. 관련성 점수가 낮은 후보는 추천 결과에서 제외한다.

인증키가 비어 있으면 외부 요청을 보내지 않고 `503 book_api_key_missing`을 반환한다. 승인 대기·인증 실패는 `book_api_authentication_failed`, 호출 제한은 `429 book_api_rate_limited`, 네트워크·시간 초과·제공자 장애는 각각 별도 코드로 구분한다. 성공 응답은 프로세스 메모리에 5분간 최대 128개 캐시해 중복 호출을 줄인다. 서버 재시작 시 캐시는 비워지며 TiDB나 게임 기록에는 영향을 주지 않는다.

## 프론트엔드 연결

`useGameRecording`이 reducer의 확정 상태를 관찰한다. PLAYING 진입에 세션을 준비하고, 새 `inputSequence`의 RESULT만 기록한다. 게임 화면을 떠나면 종료 이벤트를 넣는다. 뒤로가기로 같은 결과 화면을 복원해도 재기록하지 않는다. 기존 버튼·UI·애니메이션·판정·별 보상·`pikipick.records.v1` 저장은 그대로 유지한다.

별도 키 `pikipick.api.player.v1`에는 익명 ID, `pikipick.api.outbox.v1`에는 재시도용 세션/토큰/미전송 이벤트를 저장한다. 전송 타임아웃은 4초, 실패 후 최소 10초 대기, 15초 간격 및 online 이벤트로 재시도한다. 요청 순서를 직렬화하고 같은 UUID를 재사용한다. 서버의 유효한 저장 응답을 확인하기 전에는 synced로 취급하지 않는다. UI에 가짜 연결 성공 표시를 추가하지 않았다.

네트워크/DB 장애는 게임을 중단하지 않는다. 로컬 별은 독립적으로 계속 저장된다. 대기 큐는 최대 100세션·500이벤트이며 용량 초과 또는 저장소 접근 거부 시 서버 기록의 추가 보관이 제한될 수 있지만 게임은 계속된다. 정상 응답을 확인한 대기 항목만 큐에서 제거한다. 기존 로컬 기록 초기화는 서버의 역사 이벤트를 삭제하지 않는다. 서버 기록을 로컬 별에 합산하는 기능은 추가하지 않았다.

현재 익명 개발용 API다. 세션 토큰은 그 세션의 저장/조회 권한이며 로그인·플레이어 본인 인증을 대신하지 않는다. 여러 기기/탭의 프로필·큐 동기화와 보호자 계정은 후속 범위다. 애플리케이션은 이름·생년월일·카메라 이미지를 보내지 않는다.

## 테스트와 확인된 결과

```powershell
& ./backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -v
& 'C:/Program Files/nodejs/npm.cmd' --prefix frontend test
& 'C:/Program Files/nodejs/npm.cmd' --prefix frontend run build
```

- 백엔드 15개 테스트 통과: 실제 로컬 HTTP 요청으로 생성·저장·조회·재시도·페이지네이션·CORS·토큰/입력 검증·다른 놀이 확장을 검사한다. 마이그레이션 보존·스키마 충돌·FK·스키마 지문·TLS 설정·비밀 로그 누출 방지도 검사한다.
- 프론트엔드 41개 테스트 통과. 세 모드 전송, 동일 결과 중복 방지, 응답 유실 후 같은 UUID 재전송, 오프라인/재접속·페이지 재개·저장소 거부를 검사한다. 기존 게임 테스트도 통과했다.
- Vite 빌드 통과.
- Chrome의 실제 세 모드에서 프론트엔드→FastAPI→**격리된 SQLite** 저장과 동일 세션 GET 재조회를 확인했다. API 차단 중 게임/로컬 별 유지와 재접속 후 단일 저장도 확인했다.
- 실제 개발 API `/health`와 `/health/db`가 200을 반환했고, `/health/db`는 MySQL 연결과 TLS 검증 완료를 보고했다. TiDB에서 기존 스키마가 비어 있음을 확인한 뒤 `activities`, `activity_versions`, `players`, `play_sessions`, `play_events`, `schema_migrations`를 생성했다. API로 가위바위보 결과와 종료 이벤트를 저장하고 같은 세션에서 이벤트 2건·완료 상태·손동작 값을 다시 조회했다. 기존 데이터 삭제·초기화는 수행하지 않았다.
- 실제 Chrome에서도 WIN·LOSE·DRAW 세 모드를 플레이해 각각 실제 TiDB 세션에 결과가 저장되고 같은 세션에서 조회됨을 확인했다. API 차단 중에는 게임과 로컬 별이 유지됐고, 연결 복구 뒤 대기 결과 1건이 한 번만 저장됐다. [실제 TiDB 브라우저 검증 결과](../frontend/docs/screenshots/backend-recording/tidb-live/browser-check.json)는 토큰·식별자·접속정보를 포함하지 않는다.
- 도서 추천은 mock XML·가짜 gateway로 XML 파싱, 한국어 검색 조건, 5~7세 조건, 직접·인접·확장 개념 점수, ISBN 중복 제거, 캐시, 인증·제공자 장애 구분, Swagger 경로를 검증했다. `DATA4LIBRARY_API_KEY`는 승인 대기·미입력 상태이므로 실제 도서관 정보나루 검색 성공으로 보고하지 않는다.

브라우저 검증의 `backend.tests.browser_app:app`과 포트 8001은 테스트 전용이며 운영 진입점이 아니다. 검증 결과와 캡처는 `frontend/docs/screenshots/backend-recording/`에 보존하며 토큰/접속정보는 포함하지 않는다. 실제 API 진입점은 항상 `backend.main:app`이다.

## 운영 전 보안과 GitHub 공유

현재 연결 계정은 `SHOW GRANTS` 결과에서 `ALL PRIVILEGES`와 CREATE/DROP/ALTER/INDEX 권한이 감지되지 않았다. 다만 운영 전에는 더 좁은 별도 계정을 만들고 API 계정에는 `pikipick`의 `SELECT`, `INSERT`, 필요한 세션 종료용 `UPDATE`만 부여한다. 테이블 생성·인덱스·참조 제약은 별도 마이그레이션 계정으로 실행한다. 이번 작업에서 DB 사용자·권한·비밀번호는 변경하지 않았다.

개발 CORS는 `http://localhost:5173`, `http://127.0.0.1:5173`만 허용하고 와일드카드나 쿠키 자격증명을 허용하지 않는다. 현재는 익명 API이므로 세션 토큰을 가진 사람은 해당 세션을 조회할 수 있다. 토큰은 URL·로그에 넣지 말고 공유 기기에서는 브라우저 저장소를 정리하는 운영 정책을 마련한다. 이름·생년월일·카메라 이미지는 저장하지 않는 익명 기록 원칙을 유지한다.

운영 전 미완료 항목은 정기 백업·복구 훈련, API/DB 장애 모니터링과 알림, HTTPS 배포, 속도 제한, 보호자 인증과 데이터 보존 기간 정책, 여러 기기/탭 동기화 정책이다. 아직 구현하지 않은 항목을 완료로 표시하지 않는다.

`.env`, `.venv`, Python 캐시, 인증서/개인 키, 테스트 산출물, `.tmp` 프로필은 Git ignore 처리했다. 공유 전에는 `git status`, `git ls-files`, `git diff --check`로 비밀 파일이 추적되지 않는지 확인한다. 실제 `.env`, 인증서, 토큰, 브라우저 저장소·스크린샷에 담긴 민감값은 GitHub에 올리지 않는다. 파일 삭제·기존 Git 변경 되돌리기·커밋·push는 하지 않았다.

참고한 공식 문서: [TiDB Cloud Starter 연결](https://docs.pingcap.com/tidbcloud/connect-via-standard-connection-serverless/), [PyMySQL TLS 매개변수](https://pymysql.readthedocs.io/en/latest/modules/connections.html), [SQLAlchemy URL.create](https://docs.sqlalchemy.org/en/20/core/engines.html#sqlalchemy.engine.URL.create), [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/), [TiDB FK](https://docs.pingcap.com/tidbcloud/foreign-key/).
