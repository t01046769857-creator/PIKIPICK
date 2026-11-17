# FEATURE-030 — 개인 담당자 HOME 기록 접근과 TiDB Starter 복원 준비

## 변경 목적

기관·반·현장 세션 중심의 `0003_institution_sessions`은 교육기업 개인 담당자가 승인된 HOME 기록을 검토하는 운영 방식에 맞지 않는다. 기존 기관 모델은 호환을 위해 소스에 남기되, 기본 마이그레이션 대상에서 제외했다.

## 격리 환경 구현

- `0002_teacher_lms`: 담당자 계정·인증 세션의 공통 기반으로만 사용한다.
- `0003_institution_sessions`: legacy 선택 마이그레이션이다. 기본 `apply`로 생성되지 않는다.
- `0004_manager_home_access`: `home_record_access_grants`, `manager_access_audit_logs`를 추가하는 선택 마이그레이션이다.
- HOME 대시보드는 승인된 담당자, 활성 승인 상태, 철회 여부, 만료 여부를 서버에서 확인하고 승인 시각 이후의 기록만 조회한다.
- 성공한 HOME 대시보드 열람은 감사 로그에 기록한다.
- 보호자 계정·LMS 열람 권한은 만들지 않는다. 승인 생성은 법적 동의·권리 행사 절차가 확정될 때까지 공개 API로 제공하지 않는다.

격리 테스트에서만 전체 구조를 만들려면 다음처럼 명시적으로 선택한다.

```powershell
python -m backend.migrate apply --include-lms --include-manager-home
```

`--include-legacy-institution`은 과거 기관 전용 실험을 재현할 때만 사용한다.

## TiDB Cloud Starter 무료 백업·복원 실행 절차

1. TiDB Cloud Console에서 대상 Starter 인스턴스의 `Data > Import`로 이동한다.
2. `Export Data to > Local File`을 선택하고 데이터베이스 `pikipick`, 형식 `SQL`, 압축 `gzip`을 선택한다.
3. 완료된 export task의 CLI 다운로드 명령을 사용하여 보호된 로컬 경로에 내려받는다. Starter의 Cloud stashing export는 2일 뒤 만료된다.
4. `Data > Backup`에서 당일 자동 스냅샷도 존재하는지 기록한다. 무료 MySQL Starter의 자동 백업 보존은 1일이다.
5. 원본과 다른 새 Starter 인스턴스 또는 격리된 MySQL 호환 DB에 SQL을 복원한다. 원본 인스턴스에는 복원하지 않는다.
6. 복원 대상에서 테이블·행 수·외래키와 `GET /health/db`, 기존 세션 생성·이벤트 저장·조회 회귀 테스트를 수행한다.
7. export 시간, SHA-256, 복원 대상, 검증자, 테스트 결과를 운영 기록에 남긴다.
8. 이 증거가 모두 있을 때에만 공용 DB 적용 후보를 검토한다. 현재 후보는 `0002`와 `0004`이며 `0003`은 제외한다.

TiDB Cloud Starter는 수동 백업을 지원하지 않는다. 무료 MySQL Starter의 자동 백업은 하루 보존이므로, 고위험 DDL 전에는 SQL export와 별도 복원 검증이 필수다.

## 실행 기록

2026-11-17에 프로젝트 TLS 연결로 `backups/pikipick-20261117.sql` 논리 백업을 만들었다. 백업은 Git 제외 경로에 저장되며, 파일 내용이나 접속 정보는 로그에 출력하지 않는다. 매니페스트 검증 결과는 6개 테이블과 66개 직렬화 행의 SHA-256 일치까지 확인했다. 이 검증은 복원이 아니므로 공용 DB 마이그레이션 승인 근거로는 충분하지 않다.

## 한계

- 현재 실행 환경에는 TiDB Cloud Console 권한, 별도 Starter, 로컬 MySQL이 없어 위 절차를 실제 실행하지 못했다.
- `player_id`는 익명 브라우저 식별자이므로 단독으로 실제 아동 신원을 증명하지 않는다. 승인 생성에는 별도의 보호자 확인·연결·철회 절차와 법률 검토가 필요하다.
