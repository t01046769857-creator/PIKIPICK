# FEATURE-028 — 가정용·기관용 놀이 기록 분리

## 목적

가정의 익명 자유 놀이(HOME)는 유지하면서, 기관 놀이(INSTITUTION)는 교사가
서버에서 발급받은 일회성 아동 놀이 capability로만 기록되도록 분리한다.

## 구현

- `0003_institution_sessions`은 기존 테이블을 변경하지 않고 다음을 추가한다.
  - `institutions`, `classrooms`, `enrolled_children`
  - `teacher_institution_memberships`
  - `institution_play_leases`
  - `play_session_contexts`
- 일반 `POST /api/sessions`는 HOME 컨텍스트를 기록한다.
- `POST /api/teacher/children/{player_id}/institution-play`는 인증 교사, 담당 관계,
  기관 소속, 등록 아동을 서버에서 확인한 뒤 짧은 만료 capability를 발급한다.
- 기관 capability로 생성한 게임 세션만 INSTITUTION 컨텍스트와 lease에 연결된다.
- lease는 첫 게임 세션 생성 시 `claimed`, 종료 이벤트 시 `ended`가 된다.
- 교사용 대시보드는 `play_session_contexts.environment = INSTITUTION` 기록만 집계한다.
  HOME 및 이전 익명 기록은 기본적으로 LMS에 노출되지 않는다.

## 보안 경계

- 교사 로그인 토큰과 아이 놀이 capability는 별개다.
- `player_id`와 환경 문자열만으로 기관 권한을 인정하지 않는다.
- 만료, 변조, 종료된 기관 capability는 이벤트 저장을 차단한다.
- 브라우저에는 기관 capability를 `sessionStorage`에만 보관하며 URL에는 넣지 않는다.
- 실제 등록 아동 연결은 아직 운영 승인 절차가 없으므로, 공용 DB 적용 전 보호자/관리자
  승인과 익명 player claim 흐름을 확정해야 한다.

## 검증

로컬 SQLite 격리 테스트에서 HOME 기록, 기관 기록, 다른 기관 발급 차단, 변조 token
차단, 만료 lease 차단, 기존 세션·이벤트 회귀를 검증했다. 공용 TiDB와 TiDB staging에는
마이그레이션을 적용하지 않았다. Node/npm이 없는 환경이므로 프론트엔드 빌드·테스트는 미실행이다.
