# React · FastAPI · TiDB 연동 검증 기록 — 2026-11-17

## 범위

기존 익명 가위바위보 기록 경로의 React/Vite 설정, FastAPI API, TiDB Cloud TLS 연결을 검증했다. DB 비밀번호, API 키, 세션 토큰, 실제 식별자 값은 기록하지 않는다.

## 확인 결과

- `Settings.from_env()`는 `backend/.env`를 `override=False`로 로드한다. 이미 설정된 OS 환경변수가 우선한다.
- 상대 `DB_SSL_CA`는 `backend/`를 기준으로 해석되며, 현재 공개 CA 파일은 프로젝트 내 `backend/certs/isrgrootx1.pem`로 정상 해석됐다.
- `GET /health/db`: `status=ok`, MySQL/TiDB 연결, TLS 검증 완료.
- FastAPI `127.0.0.1:8000`과 Vite 기본 Origin `http://localhost:5173` 사이의 CORS preflight가 허용됐다.
- 무작위 UUID와 비밀이 아닌 verification marker만 사용한 신규 세션 1개를 생성하고, 성공 round_result 및 session_ended를 저장했다. API 재조회와 TiDB 재조회에서 세션 완료 및 이벤트 2건을 확인했다.

## 보호한 사항

- `.env`와 `backend/certs/`는 Git ignore 대상이다. CA 인증서는 공개 신뢰 체인 자료이고 DB 비밀번호·토큰과 다르지만, 다른 PC에서는 각 PC가 인증서를 배치하고 `.env`에 상대 또는 절대 경로를 설정해야 한다.
- 검증용 세션은 기존 세션과 구별 가능한 marker만 사용했다. 기존 기록은 수정·삭제하지 않았다.

## 미수행 및 후속 작업

- 현재 공유 DB에는 기본 6개 테이블만 있다. 교사용 LMS의 `0002_teacher_lms` migration은 아직 적용하지 않았다. 이는 공유 DB DDL 변경이므로 백업 및 staging 확인 후 명시적으로 실행해야 한다.
- 이 환경에는 Node.js/npm이 없어 실제 React build, 브라우저 게임 클릭, Vite 화면 검증은 수행하지 못했다.
