# FEATURE-050 배지 40개 에셋 매핑

## 목적

`PIKIPICK_40_badge_concepts.zip`의 40개 투명 PNG를 기존 배지 데이터와 분리해 보관하고, 의미가 확인된 항목만 기존 배지 ID를 기준으로 배지함과 보물상자에 공통 적용한다.

## 실제 프로젝트 데이터 확인

- 기존 런타임 배지 데이터는 `frontend/src/components/SecretLandDashboard.tsx`의 `secretBadges` 6개다.
- ID, 이름, 순서, 조건, 획득 상태 계산은 변경하지 않았다.
- ZIP의 40개 이미지는 콘셉트 원본이며, 기존 데이터에 없는 배지 ID를 새로 만들지 않았다.

## 적용 파일

- 원본 PNG: `frontend/src/assets/badges/badge_concept_01.png` ~ `badge_concept_40.png` (원본 보존)
- 혼입 보정본: 인접 픽셀이 확인된 21개에만 `badge_concept_##-clean.png` 추가
- 공통 매핑: `frontend/src/assets/badges/badgeAssets.ts`
- 배지함·보물상자 렌더링: `frontend/src/components/LxpSecretLandDashboard.tsx`
- 이미지 표시 및 기존 CSS 임시 도형 비중복 처리: `frontend/src/components/LxpSecretLandDashboard.css`

## 검증된 ID 매핑

| 기존 ID | 현재 UI 콘셉트 | PNG | 근거 |
| --- | --- | --- | --- |
| `FIVE_SUCCESSES` | 수정 궁전 | `badge_concept_01.png` | 성·궁전 일러스트 |
| `FIRST_SUCCESS` | 드래곤 알 | `badge_concept_02-clean.png` | 원본의 좌측 인접 배지 픽셀 제거 후 알 일러스트 |
| `TRY_AGAIN` | 무지개 나비 | `badge_concept_03-clean.png` | 원본의 좌측 인접 픽셀 제거 후 나비 일러스트 |
| `BRAVE_SUCCESS` | 반짝 보물상자 | `badge_concept_04.png` | 보물상자 일러스트 |
| `NEW_PATH` | 별빛 열쇠 | `badge_concept_06.png` | 열쇠 일러스트 |

`NEW_ACTIVITY`의 현재 콘셉트인 `달빛 여우`에 정확히 대응하는 여우 그림은 ZIP에서 확인되지 않아 매핑하지 않았다. 이 항목은 기존 CSS 표현을 유지한다.

런타임 ID가 아직 없는 현재 UI 콘셉트 중 의미가 정확히 확인된 항목도 같은 레지스트리에 연결했다: `future-2` 숲의 나침반→38, `future-3` 꿈의 등불→10, `future-10` 비밀 지도→39, `future-16` 마법 씨앗→11, `future-18` 황금 나뭇잎→16.

그 밖의 PNG는 현재 런타임 배지 ID가 없거나 이름·그림의 1:1 대응을 확인할 수 없어 배지함에 임의 표시하지 않는다.

## 공통 사용

`badgeAssetById`를 `BadgeVisual`이 사용하므로 배지함과 보물상자는 동일한 기존 배지 ID에서 동일한 PNG URL을 얻는다. 획득 상태·페이지 순서·보물상자 클릭 동작은 변경하지 않았다.

## 혼입 이미지 보정

메뉴 원본과 40개 배지 PNG를 실제 뷰어 및 가장자리 픽셀 검사로 확인한 결과, 메뉴 3개와 배지 21개에 인접 이미지 조각이 있었다. 원본 파일은 보존하고 해당 항목만 투명 마스크로 분리한 정리본을 레지스트리에서 우선 사용한다. CSS `object-fit: contain`은 변경하지 않았다.

## 검증

- 40개 PNG: 256×256, 알파 투명 영역 확인
- ID 매핑 단위 테스트 추가
- 기존 Vitest와 Vite 빌드에서 확인 예정

