# FEATURE-027 — 교사용 LMS 마이그레이션 안전성 보강

- 작성일: 2026-11-17
- 상태: 로컬 격리 검증 완료 / 공용 TiDB 및 TiDB staging 미적용

## 목적

`0002_teacher_lms`가 `teacher_accounts`, `teacher_child_assignments`,
`teacher_auth_sessions`를 추가할 때, MySQL/TiDB DDL 중단으로 일부 테이블만
생성된 상태를 정상 마이그레이션으로 오인하지 않도록 한다.

## 변경 파일

- `backend/migrate.py`
- `backend/tests/test_api.py`
- `backend/tests/test_security.py`

## 구현

`apply_migrations()`는 DDL 전 다음 조건을 검사한다.

1. 기존 LMS 테이블의 컬럼, PK, FK, 유니크 제약, 인덱스가 모델과 호환되는지 검사한다.
2. `schema_migrations`에 `0002_teacher_lms`가 있는데 세 LMS 테이블 중 하나라도 없으면 중단한다.
3. `0002_teacher_lms` 기록이 없는데 LMS 테이블이 하나라도 있으면 부분 생성 상태로 보고 중단한다.
4. 테이블 구조나 migration fingerprint가 다르면 중단한다.

중단 시 자동 삭제, 초기화, 재생성은 하지 않는다. 운영자는 백업과 실제
테이블·저널 상태를 확인한 후 별도 승인된 복구 절차를 결정해야 한다.

기존 `activities`, `activity_versions`, `players`, `play_sessions`,
`play_events`, `schema_migrations`의 구조와 데이터는 변경하지 않는다.

## 권한 회귀 검증

합성 로컬 데이터로 다음을 확인한다.

- 미인증 교사 API 요청: 401
- 변조 토큰: 401
- 만료 토큰: 401
- 담당 아동: 허용
- 비담당 아동: 403
- 비활성화된 배정: 403
- 비활성화된 교사 계정: 403

아동은 아직 익명 `players.id` 기반이며, 브라우저 `localStorage`의 ID만으로
실제 등록 아동을 확정하지 않는다. 실운영 연결에는 별도의 보호자/관리자 승인과
일회성 claim 방식이 필요하다.

## 검증 결과

- `python -m unittest -v backend.tests.test_api backend.tests.test_security`
  - 18 tests passed
- `python -m compileall -q backend`
  - passed
- `git diff --check`
  - passed

로컬 MySQL 서버, 클라이언트, 서비스 및 별도 staging 환경설정은 현재 PC에서
발견되지 않았다. 따라서 SQLite 격리 테스트 결과를 MySQL 또는 TiDB staging
검증 완료로 해석하면 안 된다.

## 남은 운영 전 확인

1. TiDB Cloud 백업과 새 인스턴스 복구를 실제로 확인한다.
2. 복구한 인스턴스 또는 별도 TiDB staging에 0002를 적용한다.
3. 실제 TiDB에서 FK, 인덱스, 재실행, 부분 실패 감지를 재검증한다.
4. 운영 교사·아동 배정과 익명 기록 claim 절차를 확정한다.
