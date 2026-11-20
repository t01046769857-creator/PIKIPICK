# 배지함 2D 이미지 통일 및 레이아웃 개선

## 변경 목적

배지함에서 실제 PNG와 CSS 임시 도형이 섞여 보이던 문제를 정리하고, 이름과 의미가 확인된 2D 일러스트만 공통 이미지 렌더링 경로로 연결했다. 배지함 헤더와 카드 그리드의 불필요한 간격도 축소했다.

## 변경 파일

- `frontend/src/assets/badges/badgeAssets.ts`
- `frontend/src/components/LxpSecretLandDashboard.tsx`
- `frontend/src/components/LxpSecretLandDashboard.css`
- `frontend/src/components/LxpSecretLandDashboard.test.tsx`

## 이미지 매핑

현재 36개 도감 항목 중 프로젝트의 매핑 검토표에서 허용한 5개를 연결했다.

| 도감 ID | 이미지 |
| --- | --- |
| `crystal-palace` | `collection/badge-art-01.png` |
| `dragon-egg` | `badge_concept_02-clean.png` |
| `rainbow-butterfly` | `badge_concept_03-clean.png` |
| `treasure-chest` | `collection/badge-art-04.png` |
| `future-10` | `collection/badge-art-39.png` |

드래곤 알과 무지개 나비는 인접 픽셀 혼입이 확인된 `collection/badge-art-02/03.png` 대신 기존 clean PNG를 유지했다. `moon-fox`, `starlight-key` 및 나머지 24개 미래 도감 항목은 현재 매핑 검토표에서 허용된 정확한 이미지가 없어 새 일러스트가 필요하다.

## 렌더링 방식

- 이미지가 있는 항목은 공통 `BadgeVisual`에서 동일한 PNG를 사용한다.
- 잠긴 항목은 동일 PNG에 기존 grayscale 스타일을 적용하고, 획득 시 컬러를 사용한다.
- 이미지가 없는 항목은 기존 CSS 배지 도형을 더 이상 표시하지 않고 `is-missing` 상태로 남긴다. 의미가 다른 이미지를 임의로 배정하지 않았다.
- `sourceId`가 있는 런타임 배지는 런타임 ID 매핑을 우선하되, 해당 매핑이 없으면 같은 도감 ID의 검증된 이미지로 보완한다.

## 레이아웃 변경

- 배지함 전용 헤더 최소 높이를 126px에서 112px로 줄였다.
- 헤더와 3×2 배지 그리드 사이 간격을 24px에서 16px로 줄였다.
- 모바일에서는 기존 2열 반응형 그리드와 카드 간격을 유지했다.
- 배지 카드의 이름·상태 문구와 페이지네이션 구조는 변경하지 않았다.

## 검증

- `npm.cmd test -- --run`: 12개 파일, 63개 테스트 통과
- `npm.cmd run build`: 통과
- 실제 `http://127.0.0.1:5173/play/world`에서 배지함 열기 확인
- 1440×900, 1024×768, 390×844에서 6페이지를 순회해 각 페이지 6개 카드 렌더링 확인
- 위 해상도에서 가로 스크롤 없음 확인

## 남은 문제

36개 전체를 모두 정확한 PNG로 통일하려면 아직 미매핑된 31개 도감 항목에 대응하는 신규 2D 일러스트가 필요하다. 현재 작업에서는 다른 배지를 재사용하거나 CSS 도형으로 완료 처리하지 않았다.
