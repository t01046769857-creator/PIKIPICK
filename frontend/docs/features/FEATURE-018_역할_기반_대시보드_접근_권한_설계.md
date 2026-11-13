# FEATURE-018 역할 기반 대시보드 접근 권한 설계

- 작성일: 2026-11-13
- 상태: 설계 완료 · 구현 및 DB 마이그레이션 미실행
- 대상: `CHILD`, `TEACHER`, `GUARDIAN`, `ADMIN` 역할의 대시보드 접근 구조
- 전제: 기존 가위바위보 규칙, 로컬 별 보상, FastAPI 세션·이벤트 저장, TiDB 데이터는 변경하지 않는다.

## 1. 현재 구조 분석

### 현재 데이터 모델

| 테이블 | 현재 책임 | 권한 관련 상태 |
|---|---|---|
| `activities` | 놀이의 자연 키, 제목, 활성 상태 | 공개 놀이 목록 |
| `activity_versions` | 놀이 버전과 허용 모드·이벤트 설정 | `activities`에 연결 |
| `players` | 이름 없이 생성되는 익명 UUID 플레이어, 선택적 연령대·언어 | 계정 또는 역할과 연결되지 않음 |
| `play_sessions` | 플레이어·놀이 버전·모드·상태·세션 토큰 해시 | 세션 단위 기능 권한만 보유 |
| `play_events` | 라운드 결과·종료 이벤트·게임별 상세 JSON | 세션 소유 여부는 세션 토큰으로 확인 |
| `schema_migrations` | 적용한 마이그레이션 버전·스키마 지문 | 변경 이력 보호 |

프런트엔드는 브라우저 `localStorage`에 익명 `player_id`와 전송 대기 상자를 저장한다. 각 놀이 세션은 별도의 임의 `session_token`을 만들고, 서버는 SHA-256 해시만 `play_sessions.token_hash`에 보관한다. `POST /api/sessions/{id}/events`와 `GET /api/sessions/{id}`는 이 토큰을 `Authorization: Bearer`로 받아 해당 **한 세션**만 읽거나 기록하게 한다.

현재 구현에는 로그인, 사용자 계정, 역할, 교사 학급, 보호자-자녀 관계, 대시보드 조회 API가 없다. 따라서 세션 토큰을 로그인 토큰이나 역할 증명으로 재사용하면 안 된다.

### 현재 보안 경계와 한계

- 세션 토큰은 세션별 난수이며 DB에는 해시만 저장되고, 이벤트 중복 저장은 `client_event_id`와 `sequence` 제약으로 막는다.
- CORS는 개발용 `localhost:5173`과 `127.0.0.1:5173`만 허용한다. CORS는 브라우저 정책일 뿐 권한 검사가 아니다.
- 기존 `POST /api/sessions`는 익명 놀이를 유지하기 위해 클라이언트가 전달한 `player_id`를 허용한다. 이 값만으로는 기존 세션을 읽을 수 없지만, 향후 계정 소유권 판단에 그대로 사용하면 안 된다.
- 현재 별 보상은 로컬 기록이며 공용 대시보드 데이터와 동기화하거나 발달 평가로 해석하지 않는다.

## 2. 권한 모델

역할은 계정에 부여하는 권한 묶음이다. 한 사람이 보호자이면서 교사일 수 있으므로 `accounts.role` 한 칸으로 고정하지 않고 `account_roles`로 다중 역할을 지원한다. 역할만으로는 아이 기록을 열람할 수 없으며, 반드시 자녀 관계 또는 유효한 교사 접근 허가를 함께 확인한다.

| 역할 | 허용 화면 | 허용 API 범위 | 금지 범위 |
|---|---|---|---|
| `CHILD` | 본인의 모험 지도, 본인 활동 요약, 다음 놀이 | 자신의 `child_profile`에 연결된 요약 조회, 놀이 시작 | 교사·보호자 화면, 다른 아이 기록, 관계·동의 변경 |
| `GUARDIAN` | 연결된 자녀 카드, 참여 요약, 교사 공유 동의 | 자신과 연결된 자녀의 요약 조회, 교사 접근 승인·철회 | 다른 가정·학급 기록, 원본 이벤트 일괄 내려받기 |
| `TEACHER` | 담당 학급 지도, 참여 현황, 허가된 아이의 요약 | 담당 학급·유효 동의 범위의 집계와 최소 개인 요약 | 보호자 설정, 학급 밖 아이, 원본 세션 토큰·원본 이벤트 수정 |
| `ADMIN` | 활동·버전 운영, 계정 상태, 감사 기록 | 운영 설정과 제한된 감사 조회 | 별도 사유·감사 절차 없는 전체 아동 원본 기록 열람 |

`ADMIN`은 모든 아동 데이터를 자동으로 볼 수 있는 역할이 아니다. 운영 작업과 아동 기록 열람을 분리하고, 추후 정말 필요한 지원 열람은 사유·기간·감사 로그가 남는 별도 절차로 설계한다.

## 3. 관계와 데이터 접근 규칙

```text
accounts ──< account_roles
    │
    ├──< guardian_child_links >── child_profiles ──1:1── players
    │                                  │
    └──< teacher_group_staff >── teacher_groups ──< teacher_group_memberships >── child_profiles
                                                   │
                                               teacher_child_access_grants

child_profiles ──1:1── players ──< play_sessions ──< play_events
```

1. **보호자와 자녀**: `guardian_child_links`가 `GUARDIAN` 계정과 `child_profiles`를 연결한다. 활성 연결이 있어야 자녀 요약과 동의 관리가 가능하다.
2. **교사와 담당 아이**: 교사 계정은 `teacher_group_staff`를 통해 학급에 속한다. 아이는 `teacher_group_memberships`로 학급에 속할 수 있으나, 개인 요약 열람은 `teacher_child_access_grants`의 활성 동의까지 필요하다.
3. **아이 자신의 화면**: 아이 전용 단말에서 사용하는 짧은 수명의 아이 세션은 `child_profile` 하나로만 한정한다. 교사·보호자의 장기 로그인 토큰을 아이 화면에 전달하지 않는다.
4. **접근 해지**: 보호자 연결, 학급 소속, 교사 열람 동의 중 하나라도 비활성·만료·철회되면 다음 요청부터 즉시 접근을 거부한다. 이미 발급된 대시보드 응답을 캐시하지 않는다.

## 4. 익명 플레이어 기록을 계정에 안전하게 연결하는 방법

기존 익명 플레이는 계속 가능해야 한다. 계정 연결은 자동 추측이나 `player_id` 입력으로 하지 않고, 아래 순서로 한 번만 완료한다.

1. 익명 브라우저가 서버에 **일회성 연결 요청**을 보낸다. 서버는 해당 익명 플레이어용 `claim_token`을 만들고 해시만 보관한다.
2. 보호자 또는 교사가 로그인한 상태에서 짧은 코드·QR·같은 기기 확인으로 연결 요청을 승인한다.
3. 서버는 토큰 해시, 만료 시간, 미사용 상태, 승인자 권한을 모두 확인한 뒤에만 `child_profiles.player_id`를 만든다.
4. 연결 뒤에도 기존 `players.id`, `play_sessions`, `play_events`의 PK·FK는 바꾸지 않는다. 대시보드는 `child_profiles.player_id = players.id` 관계로 기존 기록을 읽는다.
5. 토큰은 10분 이하 유효, 한 번만 사용, 전송·로그·URL 저장 금지로 한다. 같은 `player_id`는 하나의 활성 `child_profile`에만 연결한다.

새 인증 대시보드 API는 클라이언트가 보낸 UUID만 믿어 기록 소유권을 정하지 않는다. 기존 익명 세션 API의 호환성을 지키되, 연결된 플레이어로 새 세션을 만들 때는 서버가 발급한 플레이어 연결 증명 또는 로그인 주체의 권한을 추가로 확인하는 버전 전환이 필요하다.

## 5. 추가 DB 테이블과 마이그레이션 설계

모든 변경은 새 테이블 추가와 새 `schema_migrations` revision으로만 수행한다. 기존 여섯 테이블의 삭제·초기화·열 변경은 하지 않는다.

| 테이블 | 주요 열과 제약 | 목적 |
|---|---|---|
| `accounts` | `id` PK, `status`, `created_at`, `disabled_at` | 로그인 가능한 주체의 최소 계정 상태 |
| `auth_identities` | `account_id` FK, `provider`, `subject`, `UNIQUE(provider, subject)` | 비밀번호·소셜·패스키 공급자 식별자 연결. 인증 비밀은 별도 인증 공급자 또는 검증된 해시로 관리 |
| `account_roles` | `account_id` FK, `role CHECK (CHILD, TEACHER, GUARDIAN, ADMIN)`, `UNIQUE(account_id, role)` | 다중 역할 RBAC |
| `auth_refresh_sessions` | `account_id` FK, `token_hash`, `expires_at`, `revoked_at`, 기기 표시명 선택 | 갱신 토큰 폐기·기기별 로그아웃. 원문 토큰은 저장하지 않음 |
| `child_profiles` | `id` PK, `player_id UNIQUE FK(players.id)`, `child_account_id UNIQUE NULL FK(accounts.id)`, 표시 별칭 선택 | 익명 게임 기록의 정식 아동 프로필 연결. 실명·생년월일은 기본 저장하지 않음 |
| `guardian_child_links` | `guardian_account_id` FK, `child_profile_id` FK, `status`, `UNIQUE(guardian_account_id, child_profile_id)` | 보호자와 자녀의 접근 관계 |
| `teacher_groups` | `id` PK, `name`, `status` | 학급 또는 담당 그룹. 이름은 최소 식별 용도로만 사용 |
| `teacher_group_staff` | `teacher_group_id` FK, `teacher_account_id` FK, `UNIQUE(...)` | 교사와 담당 그룹 연결 |
| `teacher_group_memberships` | `teacher_group_id` FK, `child_profile_id` FK, `active_from`, `active_until`, `UNIQUE(...)` | 아이의 학급 소속 기간 |
| `teacher_child_access_grants` | `teacher_account_id` FK, `child_profile_id` FK, `scope`, `consent_state`, `expires_at`, `revoked_at` | 보호자 동의에 근거한 개별 열람 범위 |
| `anonymous_player_claims` | `player_id` FK, `token_hash UNIQUE`, `expires_at`, `used_at`, `requested_at` | 익명 기록을 계정에 연결하는 일회성 증명 |
| `authorization_audit_logs` | 요청 주체·대상·행동·결과·사유·시각, 민감 본문 제외 | 관계 변경·동의·관리자 기능을 감사 |

권장 인덱스는 관계 테이블의 `(child_profile_id, 상태/만료)`, `(account_id, 상태)`, 교사 그룹의 `(teacher_account_id, teacher_group_id)`, 감사 로그의 `(actor_account_id, created_at)`이다. FK에는 삭제 연쇄를 기본으로 두지 않는다. 계정이나 관계를 비활성화하여 기록 보존과 즉시 차단을 함께 달성한다.

## 6. API 경계와 아이의 교사용 URL 차단

프런트엔드 라우트 숨김은 편의 기능일 뿐 보안 수단이 아니다. 모든 역할별 API는 아래 두 단계로 서버에서 검사한다.

1. `require_authenticated_account`: 짧은 수명의 접근 토큰을 검증하고 계정 상태와 역할을 읽는다.
2. `require_role` + `require_child_access`: 필요한 역할뿐 아니라 요청 대상 아이가 보호자 연결 또는 교사 동의·학급 범위 안에 있는지 같은 트랜잭션에서 확인한다.

권장 API 구분은 다음과 같다.

| 경로 예시 | 필요한 검증 |
|---|---|
| `GET /api/child/dashboard` | 로그인된 `CHILD`, 자신의 `child_profile`만 |
| `GET /api/guardian/children/{child_id}/summary` | `GUARDIAN` + 활성 `guardian_child_links` |
| `POST /api/guardian/children/{child_id}/teacher-grants` | `GUARDIAN` + 활성 연결 |
| `GET /api/teacher/groups/{group_id}/dashboard` | `TEACHER` + 해당 그룹 교직원 연결 |
| `GET /api/teacher/children/{child_id}/summary` | `TEACHER` + 활성 그룹 소속 + 활성 열람 동의 |
| `GET /api/admin/...` | `ADMIN` + 감사 정책 |
| 기존 `/api/sessions/*` | 기존 세션 기능 토큰 검증을 그대로 유지 |

아이가 교사용 URL을 직접 입력하면 로그인 없음은 `401`, 로그인했지만 역할 또는 관계가 맞지 않으면 리소스 존재를 노출하지 않는 `404` 또는 정책상 `403`으로 거부한다. 서버는 원본 이벤트나 세션 토큰을 역할 대시보드에 반환하지 않는다. 클라이언트 라우터도 역할별 진입점을 숨기고 잘못된 경로는 아이의 기본 지도 화면으로 안내한다.

운영 환경에서는 HTTPS, `HttpOnly`·`Secure`·`SameSite` 쿠키 또는 동등한 안전한 토큰 보관, CSRF 방어, 허용 출처의 명시적 목록, 요청 속도 제한, 토큰 폐기 목록 검사가 필요하다. 현재 개발 CORS 설정과 브라우저 `localStorage`의 익명 세션 대기 상자는 역할 인증용으로 승격하지 않는다.

## 7. Figma 역할별 화면 구조

현재 Figma 파일에는 **아이용 모험 지도 메인**과 **규칙 숲 상세 카드**만 설계돼 있다. 역할 인증·대시보드 화면은 아직 만들지 않았다.

| Figma 페이지 | 화면 구성 | 데이터 표현 원칙 |
|---|---|---|
| `01 · 아이용 모험 지도` | 구역 전환, 열린 장소, 피키, 다음 놀이 카드 | 본인의 참여 경험만. 승패 순위·비교·평가 없음 |
| `02 · 보호자 연결` | 자녀 프로필 선택, 연결 승인, 교사 공유 범위·철회 | 실명 대신 별칭 우선, 동의 범위와 만료를 명확히 표시 |
| `03 · 교사 놀이 기록` | 담당 학급 선택, 참여 흐름, 허가된 아이의 최소 요약 | 동일 세계관의 지도형 진행 상태를 사용하고 평가 그래프를 기본값으로 두지 않음 |
| `04 · 교사 아이 상세` | 활동 이력 요약, 다음 놀이 제안, 보호자 동의 상태 | 동의가 없거나 만료되면 빈 상태·연결 안내만 표시 |
| `05 · 관리자 운영` | 활동 버전, 계정 상태, 감사 기록 | 아동 원본 이벤트는 기본 화면에서 제외 |
| `06 · 인증·역할 전환` | 보호자/교사 로그인, 아이 단말 진입, 안전한 로그아웃 | 아이에게 긴 설명·비밀번호 입력을 요구하지 않는 보조자 흐름 |

모바일은 아이 지도와 보호자 연결을 우선 설계하고, 교사·관리자는 넓은 표와 필터가 필요한 만큼 데스크톱 우선으로 설계한다. 지도는 한 화면에 모든 구역을 넣지 않고 현재 구역과 전환 제어만 보여 준다.

## 8. 개발 우선순위

1. **인증 기반 먼저**: 계정·인증 공급자·갱신 세션·역할 미들웨어를 만들고, 기존 익명 놀이 API는 회귀 테스트로 보존한다.
2. **관계와 동의**: 아동 프로필, 보호자 연결, 익명 기록 연결 절차, 교사 접근 허가와 철회를 만든다.
3. **읽기 전용 대시보드 API**: 아이·보호자·교사의 최소 요약 API부터 추가한다. 원본 이벤트 수정 API는 만들지 않는다.
4. **Figma 역할별 확장**: 권한 정책이 확정된 뒤 보호자·교사·모바일 프레임과 빈 상태를 제작한다.
5. **운영 보안**: 속도 제한, 감사 조회, 보존 기간, 백업·복구, 침해 대응 절차를 문서화하고 점검한다.

## 9. 테스트 시나리오

| 범주 | 시나리오 | 기대 결과 |
|---|---|---|
| 기존 회귀 | 익명 WIN·LOSE·DRAW 세션 생성, 이벤트 저장·재전송·조회 | 현행 세션 토큰 방식과 중복 방지가 그대로 동작 |
| 역할 | 각 역할이 자기 대시보드만 요청 | 허용 역할은 200, 비로그인은 401, 다른 역할은 403/404 |
| 보호자 | 보호자 A가 자녀 A·B를 조회, 자녀 C를 요청 | A·B만 요약 조회, C는 차단 |
| 교사 | 담당 그룹·활성 동의·유효 기간이 모두 있는 아이 조회 | 세 조건을 모두 충족할 때만 최소 요약 반환 |
| 동의 철회 | 보호자가 교사 열람을 철회한 직후 재요청 | 새 요청부터 즉시 차단, 감사 로그 생성 |
| 익명 연결 | 만료·재사용·다른 플레이어의 claim 토큰 사용 | 모두 거부, 성공한 한 번만 `child_profiles`에 연결 |
| 직접 URL/API | 아이 토큰으로 교사 URL과 API 호출 | 서버에서 차단. 클라이언트 라우트 숨김만으로 통과하지 않음 |
| 데이터 최소화 | 역할 API 응답·로그·감사 로그 검사 | 세션 토큰, 원본 인증 비밀, 필요 없는 원본 이벤트·실명·생년월일 미포함 |
| 마이그레이션 | 빈 DB와 기존 TiDB 스키마에서 새 revision dry-run·재실행 | 추가형 테이블만 생성, 기존 여섯 테이블과 데이터 불변, 재실행 무변경 |

## 10. 이번 단계의 범위와 다음 결정

이번 문서는 설계만 제공한다. 모델, FastAPI 라우터, 마이그레이션, TiDB 데이터, 프런트 라우트, Figma 프레임은 변경하지 않았다.

구현 전에 확정할 항목은 인증 공급자(자체 비밀번호, 패스키, 학교/기관 SSO 등), 교사 초대·학급 가입 절차, 보호자 동의 문구·보존 기간, 아이 단말의 시작 방식이다. 이 결정을 바탕으로 최소 테이블부터 새 revision으로 추가한다.
