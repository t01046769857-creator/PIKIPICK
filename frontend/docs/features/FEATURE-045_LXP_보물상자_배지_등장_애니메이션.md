# FEATURE-045 — 보물상자 배지 등장 애니메이션

## 변경 목적

대시보드 상단 보물상자에 획득 배지가 처음부터 상자 밖에 정지해 보이던 문제를 수정했다. 기존 보물상자·배지 에셋과 획득 데이터는 유지하고, 표시 순서와 등장 동작만 보완했다.

## 수정 파일

- `frontend/src/components/LxpSecretLandDashboard.css`

## 구현 방식

- 보물상자 내부의 배지 슬롯을 초기 상태에서 `opacity: 0`, `translateY(28px)`, `scale(.72)`로 숨긴다.
- 가장 최근 배지(`.is-newest`)는 약 1.65초 동안 상자 안에서 위로 올라오며 살짝 튕긴 뒤 상자 위에 정착한다.
- 기존 배지는 짧은 정착 애니메이션으로 표시해 새 배지와 구분한다.
- 기존 열린 보물상자 이미지에는 작은 스케일·위치 반응을 적용하고, 기존 빛 레이어는 등장 시 확대·감쇠한다.
- `prefers-reduced-motion: reduce`에서는 애니메이션 시간을 즉시 수준으로 줄인다.

새 이미지, 배지 조건, API, DB, 게임 규칙은 변경하지 않았다.

## 검증

- `frontend`: `npm.cmd run build` 통과
- `frontend`: `npm.cmd run test -- --run` 통과 (11 files, 58 tests)
- 실제 브라우저에서 합성 로컬 기록 `pikipick.records.v1 = { successCount: 5, partyCount: 1 }`로 재현
  - 등장 중: 최신 슬롯 `opacity: 0`, `translateY(28px) scale(.72)`
  - 종료 후: 최신 슬롯 `opacity: 1`, `translateY(-16px) scale(1.04)`
  - 보조 슬롯: `opacity: .9`, `translateY(-8px) scale(.92)`
- 캡처: `artifacts-secret-land-treasure-rising.png`, `artifacts-secret-land-treasure-settled.png`

현재 브라우저 검증은 합성 기록으로 수행했으며, 운영 데이터는 변경하지 않았다.

## 남은 문제

- 현재 UI의 보물상자 이미지는 이미 열린 상태의 기존 에셋이므로, 실제 뚜껑이 열리는 프레임 자체는 이미지 교체 없이 CSS의 미세한 반응과 빛 효과로 표현한다.
