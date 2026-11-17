# 교사 권한과 개인 맞춤형 LMS

- 상태: 실제 API 구현 완료 / 실제 운영 계정·담당 관계 데이터 미구성
- 작성일: 2026-11-17
- 관련 파일: `backend/main.py`, `backend/models.py`, `backend/migrate.py`, `frontend/src/teacher/teacherApi.ts`, `frontend/src/components/TeacherLmsDashboard.tsx`

## 기존 상태 확인

기존 Bearer 토큰은 익명 놀이 세션 소유를 확인하는 capability token이었다. 교사 계정, 역할, 담당 아동 관계, 교사용 보호 API는 없었다. `Player`는 아동 로그인 계정이 아닌 익명 놀이 식별자이므로 브라우저의 player ID만으로 교사 기록을 열 수 없었다.

## 실제 구현 완료

- 별도 `teacher_accounts`, `teacher_auth_sessions`, `teacher_child_assignments` 테이블을 추가하는 additive migration `0002_teacher_lms`를 만들었다. 기존 놀이 테이블/데이터를 변경하거나 삭제하지 않는다.
- 배포 전에는 TiDB 백업과 staging migration 검증이 필요하다. 롤백도 테이블을 삭제하지 않고 이전 애플리케이션 버전으로 되돌린 뒤 새 테이블을 비활성 상태로 남기는 방식만 허용한다.
- 교사 비밀번호는 salted `scrypt` 해시로만 저장한다. 회원가입·담당 관계 생성 API는 제공하지 않으며, 계정과 배정은 승인된 관리자/운영 절차로만 생성한다.
- 교사 로그인은 별도의 opaque Bearer token을 발급한다. 놀이 세션 token을 교사용으로 재사용하지 않는다.
- `/api/teacher/children` 및 `/api/teacher/children/{id}/dashboard`는 서버에서 교사 인증과 담당 관계를 모두 검사한다. 다른 child ID를 URL에 넣어도 `403`을 반환한다.
- 실제 대시보드는 참여, round_result 시도, 목표에 맞는 선택, 목표와 다른 선택, 놀이 종류별 막대, 기간별 변화, 최근 세션을 같은 원본 이벤트에서 집계한다.
- 추천은 최근 실제 기록만 사용하는 설명 가능한 규칙이다. 현재 구현된 가위바위보/규칙 연습으로 연결되는 제안만 만든다. 도서관 API 승인 전에는 책을 꾸며 내지 않고 미지원 사유만 표시한다.

## 데이터 한계와 표시 방식

현재 `PlayEvent`에는 명시적인 “재도전” 이벤트가 없다. 성공하지 못한 round_result를 재도전으로 추정하지 않으며, 대시보드에서는 `재도전 미지원`으로 표시한다. 필요 시 향후 별도 이벤트 타입과 스키마 revision을 설계해야 한다.

또한 현재 아이용 서비스는 익명 Player 식별자를 사용한다. 교사 조회 권한은 서버의 담당 관계로 보호하지만, 실제 아동 신원을 강하게 보증하는 계정/보호자 동의/초대 기반 연결은 아직 없다. 운영에서 실제 아동 데이터를 연결하기 전 별도 enrollment 설계와 개인정보 처리 검토가 필요하다.

## 데모 분리

`/teacher/demo/child`의 기존 정적 데모는 유지한다. 실제 `/teacher/dashboard`, `/teacher/children/:id`는 보호 API를 호출하며 데모 데이터를 섞지 않는다.

## 검증

- 백엔드: `python -m unittest backend.tests.test_api backend.tests.test_security` — 16 tests passed.
- 포함된 권한 검증: 로그인 성공/실패, 미인증 차단, 담당 아동 허용, 비담당 child URL의 403, 기록 집계, 기존 세션 API 회귀.
- 미검증: Node/Vite 및 브라우저 실행 환경이 없어 프런트엔드 build/Vitest/반응형 화면은 이 작업 환경에서 실행하지 못했다. 실제 TiDB 마이그레이션 및 운영 계정 provisioning도 수행하지 않았다.
