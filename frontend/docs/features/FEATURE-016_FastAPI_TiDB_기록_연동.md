# FEATURE-016 — FastAPI·TiDB 놀이 기록 기반

- 날짜: 2026-11-13
- 목적: 게임 UI·판정·로컬 보상을 보존하면서 여러 놀이에서 사용할 수 있는 API/공통 DB 구조를 추가한다.
- 상태: 구현, 로컬 통합 검증 및 실제 TiDB Cloud 연결·저장·조회 검증 완료.

## 변경 파일과 동작

- `backend/`: 설정·TLS DB 연결, 공통 ORM 모델, 입력 검증, FastAPI API 6종, 명시적 재실행 마이그레이션, 테스트 및 실행 문서를 생성했다. 기존 가상환경을 유지했다.
- `frontend/src/game/apiRecorder.ts`, `useGameRecording.ts`, `apiRecorder.test.ts`: 선택적 서버 기록과 독립 대기 큐를 추가했다.
- `frontend/src/App.tsx`: 저장 hook import/호출만 추가했다. 기존 미커밋 UI 변경을 보존했다.
- `frontend/.env.example`: 공개 API 주소만 예시로 제공한다.
- `.gitignore`: 로컬 비밀·인증서·테스트·임시 프로필 제외를 보완했다. 파일은 삭제하지 않았다.

`activities → activity_versions → play_sessions → play_events`로 놀이 정의·버전·공통 세션·JSON 상세 데이터를 분리하고 `players`에 익명 ID를 보관한다. migration journal을 포함해 TiDB에 `activities`, `activity_versions`, `players`, `play_sessions`, `play_events`, `schema_migrations` 6개 테이블을 생성했다. 사전 검사에서 기존 스키마는 비어 있었으며 삭제·초기화·덮어쓰기는 하지 않았다.

사용자 화면 변화는 없다. RESULT로 확정된 새 입력만 API로 전송하고, 게임 종료/이동 시 종료 이벤트를 기록한다. 실패하면 재전송용 큐를 보관하며 기존 localStorage 보상 기록은 별도 유지한다. 같은 결과 화면의 복원이나 재전송으로 기록이 중복되지 않게 세션/이벤트 UUID와 고유 제약을 사용한다.

## 보존·검증·제한

캐릭터·공식 손 에셋·배경·메뉴·카드·애니메이션·reducer·rules·보상·records.ts는 이번 연동에서 변경하지 않았다. 서버에 추가한 손 조합 검증은 기록의 일관성 검사이며 게임 규칙을 바꾸지 않는다. MediaPipe·학습 모델은 변경하지 않았다.

백엔드 15개, 프론트엔드 41개 테스트와 빌드가 통과했다. SQLite fixture를 사용하는 로컬 HTTP/Chrome 검증은 실제 TiDB 검증과 구분한다. 이후 실제 TiDB를 사용하는 Chrome에서 WIN·LOSE·DRAW 각 모드의 세션 생성·결과 저장·동일 세션 조회를 확인했고, API 차단 중 게임·로컬 별 유지와 복구 후 결과 1건의 단일 저장도 확인했다. [실제 TiDB 브라우저 결과](../screenshots/backend-recording/tidb-live/browser-check.json)는 DB 종류와 검증 결과만 기록한다.

초기 `.env`가 없어 비밀 값 없는 템플릿을 만들었다. 이후 사용자가 로컬에 접속정보와 CA 경로를 입력한 상태에서 실제 API를 재시작했다. `/health/db`는 MySQL 연결 및 TLS 검증 완료로 200을 반환했다. 마이그레이션 후 API를 통해 검증용 가위바위보 세션과 결과·종료 이벤트를 저장하고, 같은 세션의 완료 상태·이벤트 수·손동작 값을 조회해 일치 여부를 확인했다. `.env.example`에서 발견된 실제 연결 사용자 식별자는 안전한 자리표시자로 교체했으며, 실제 `.env` 값은 변경하지 않았다. 비밀번호·접속 문자열·토큰은 출력하거나 문서화하지 않았다.

공용 TiDB 데이터베이스 구축과 FastAPI 저장·조회 API 연동, 실제 브라우저 자동 저장 검증은 완료됐다. 운영 전에는 별도 최소 권한 애플리케이션 계정, 백업·모니터링, HTTPS 배포·속도 제한, 여러 기기/탭 동기화 및 보호자 인증 정책을 검토한다.

자세한 구조·API 예시·보안·대기 큐 한계·실행 명령은 [backend/README.md](../../../backend/README.md)에 있다. 실제 클라우드 재검증, 여러 기기/탭 프로필 동기화, 보호자 인증, 운영 배포는 남아 있다. Git push는 실행하지 않았다.
