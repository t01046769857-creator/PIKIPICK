# FEATURE-047 — 비밀나라 모험 제목의 월드 외부 배치

## 변경 목적

모험 제목이 월드 이미지 위의 반투명 오버레이로 렌더링되어 피키 이동 영역을 가리던 문제를 수정했다.

## 수정 파일

- `frontend/src/components/LxpSecretLandDashboard.tsx`
- `frontend/src/components/LxpSecretLandDashboard.css`

## 구현 방식

활성 `LxpSecretLandDashboard`의 DOM을 다음 순서로 변경했다.

1. 상위 화면의 뒤로가기 영역
2. `.lxp-secret__adventure-heading`
3. `.lxp-secret__top` — 보물상자와 배지 도감
4. `.lxp-secret__map` — 제목 없는 모험 월드
5. `.lxp-secret__bottom` — 하단 기록 카드

제목 헤더는 일반 문서 흐름에 배치했으며 `position: absolute`, 음수 여백, transform 이동을 사용하지 않는다. 지도 내부에는 `LivingPath`만 남기고, 기존 월드 위 반투명 제목 패널 스타일은 비활성화했다.

## 검증

- `npm.cmd run build` 통과
- Vitest 11개 파일, 58개 테스트 통과
- 실제 브라우저 DOM 확인:
  - 제목 부모: `.lxp-secret`
  - 지도 자식: `lxp-secret__path-wrap lxp-secret__path-wrap--living lxp-secret__viewport`만 존재
  - 화면 순서: 제목 → 보물/도감 → 월드
- 캡처:
  - `artifacts-secret-land-heading-outside-1440x900.png`
  - `artifacts-secret-land-heading-outside-1024x768.png`
  - `artifacts-secret-land-heading-outside-390x844.png`

배경, 피키, 경로, 카메라, 배지 기능, API, DB는 변경하지 않았다.
