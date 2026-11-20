# FEATURE-042 교육 담당자 LMS 사이드바 대시보드

## 변경 목적

기존 교사 LMS의 상단 탭 중심 화면을 왼쪽 메뉴와 오른쪽 작업 공간 구조로 재배치했다. 기존 API, 권한 검사, 아동 선택, 기간 필터와 분석 근거 패널은 유지한다.

## 수정 파일

- `frontend/src/components/TeacherLmsDashboard.tsx`
- `frontend/src/components/TeacherLmsDashboard.css`

## 구현 내용

- `TeacherLmsDashboard`에 `overview`, `content`, `evidence`, `support` 메뉴 상태를 추가했다.
- 왼쪽 사이드바의 메뉴 선택으로 오른쪽 `DashboardView`만 교체한다.
- 기존 상단 탭은 중복 표시하지 않도록 LMS workspace 범위에서 숨겼다.
- 기존 담당 아동 선택, 조회 기간, 실제 FastAPI 데이터, 권한 오류 화면은 그대로 사용한다.
- 데스크톱은 사이드바와 작업 영역 2열, 작은 화면은 가로 메뉴 또는 접이식에 가까운 1열로 전환한다.

## 데이터 지표

- 콘텐츠 경험: API의 `activities[].attempts`를 사용하며 세션 수와 혼동하지 않는다.
- 요일 분포: API의 `weekday_distribution[].attempts`를 사용한다.
- 기간 추이: API의 `trend[].attempts`를 사용한다.
- 빈 배열은 임의 그래프 대신 기존 빈 상태 문구를 표시한다.
- 분석 근거 패널에서 기간, 원본 이벤트 수, 계산식, 버전과 해석 한계를 확인한다.

## 영향 범위

교사 로그인·담당 아동 권한·FastAPI/TiDB 조회·아동용 LXP·게임 규칙·DB 스키마는 변경하지 않았다. CMS와 미확정 추천/알림 기능은 추가하지 않았다.

## 검증

- TypeScript/Vite production build: 통과.
- 브라우저 해상도별 실제 캡처와 권한이 필요한 실데이터 화면은 현재 세션 환경에서 추가 확인 필요.
- Vitest 및 백엔드 회귀 테스트 결과는 작업 종료 보고에 기록한다.

## 남은 문제

현재 저장소의 일부 기존 LMS 문자열이 인코딩이 깨진 상태로 보인다. 이번 작업에서는 기능 범위를 벗어나 해당 문구를 일괄 정리하지 않았다.
