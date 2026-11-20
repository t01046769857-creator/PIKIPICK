# FEATURE-044 비밀나라 승인 월드 적용 및 경로 검증

## 목적

승인된 `world-terrain-compact-rainbow-bridge-v3.png`를 기존 비밀나라 화면의 공통 월드에 연결하고, 피키의 발 접지점이 실제 흙길과 무지개 다리의 석재 보행면을 따라가도록 정렬한다.

## 변경 파일

- `frontend/src/assets/secret-land/world-terrain-compact-rainbow-bridge-v3-2400x800.png`
- `frontend/src/assets/secret-land/secretLandAssets.ts`
- `frontend/src/components/LxpSecretLandDashboard.tsx`
- `frontend/src/components/LxpSecretLandDashboard.css`
- `frontend/src/components/LxpSecretLandDashboard.test.tsx`

## 구현 방식

- 승인 시안은 원본을 덮어쓰지 않고 3:1 비율로 `2400x800` 적용용 복사본을 만들었다.
- 활성 월드는 새 통합 배경 한 장을 사용한다. 기존 무지개 다리 목적지 오버레이는 중복을 피하기 위해 활성 렌더링에서 제외했다.
- 경로는 기존 SVG 장식 경로를 사용하지 않고, 승인 이미지의 실제 길과 석재 데크 중심선을 읽어 12개 월드 기준점으로 구성했다.
- 피키 이동은 기준점 사이를 Catmull-Rom 보간하여 연결한다. 다리 구간은 진입부, 오르막, 정상, 내리막, 출구를 포함한다.
- 탐험가 PNG의 접지 기준은 `footAnchor = { x: 974 / 1460, y: 1025 / 1078 }`를 유지한다.
- 화면의 가로·세로 비율이 월드 비율과 달라도 배경을 비균일하게 늘리지 않도록 월드 뷰포트의 실제 크기를 측정하고, 월드 좌표를 균일 스케일로 렌더링한다.

## 검증

- `npm.cmd run build`: 통과
- `npm.cmd run test -- --run`: 11개 파일, 58개 테스트 통과
- 개발 서버 Chrome 캡처: 1440x900에서 왼쪽 흙길, 다리 진입, 오르막, 정상, 내리막, 출구, 오른쪽 흙길 7개 구간 확인
- 개발 서버 Chrome 캡처: 1024x768 및 390x844에서 월드 비율과 피키 발 기준점 확인
- `?debug=feet`의 화면 오차는 DOM 목표점과 실제 접지 표시점의 차이이며, 최종 판정은 승인 배경의 보행면과 피키 발의 시각적 위치를 함께 확인했다.

## 남은 사항

- 디버그 오버레이는 개발 환경 URL에서만 표시된다.
- 실제 사용자 기록으로 모든 해금·이동 시나리오를 재생하는 검증은 합성 브라우저 캡처 범위 밖이다.
