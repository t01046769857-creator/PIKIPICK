# FEATURE-031 TiDB 격리 복원 및 LMS 마이그레이션 검증

## 목적

공용 TiDB의 기존 놀이 기록을 보존한 채 `0002_teacher_lms`와 `0004_manager_home_access`만 적용하기 전에, 논리 백업 복원과 실제 API 권한 흐름을 검증했다. `0003_institution_sessions`는 적용 대상에서 제외했다.

## 검증한 구성

- 백업: `backups/pikipick-20261117-restore.sql`과 매니페스트의 SHA-256 일치 확인
- 격리 DB: 로컬 MariaDB, TiDB와 맞춘 `utf8mb4_bin` 정렬
- 복원: 기존 6개 테이블, 66개 행, 외래키 고아 레코드 0건
- 마이그레이션: `0002`, `0004` 적용 및 재실행 안전성 확인. `0003` 미적용.
- API: HOME 세션/이벤트 저장·조회, 미인증 거부, 승인된 담당자 조회, 철회 후 거부를 실제 격리 DB에서 확인

## 구현 변경

`backend/main.py`의 HOME 기록 경로가 선택적 레거시 기관 스키마(`0003`)를 무조건 참조하던 문제를 수정했다. `play_session_contexts`가 없으면 HOME 세션은 해당 테이블을 읽거나 쓰지 않으며, 기관 전용 API는 안전한 503 응답으로 제한한다. 이로써 `0003` 없이도 HOME 기록과 `0004`의 승인 기반 조회가 동작한다.

## 공용 적용 및 확인

격리 복원 검증 뒤 공용 TiDB에 다섯 개의 추가 테이블만 생성했다.

- `teacher_accounts`
- `teacher_auth_sessions`
- `teacher_child_assignments`
- `home_record_access_grants`
- `manager_access_audit_logs`

재실행 시 중복 생성이 없었고, TLS 연결은 유지됐다. 공용 DB 검증에는 `.invalid` 도메인의 합성 담당자·합성 HOME 세션만 사용했다. 실제 아동 신원 연결이나 보호자 동의 활성화는 수행하지 않았다.

## 남은 제한

- 법정대리인 동의 확인, 보관·삭제·철회 절차의 운영 정책과 실제 연결은 별도 법률·보안 검토가 필요하다.
- 로컬 MariaDB 검증은 TiDB Cloud staging 검증과 동일하지 않다.
- Node/npm이 없어 프론트엔드 빌드·테스트는 이번 환경에서 실행하지 못했다.
