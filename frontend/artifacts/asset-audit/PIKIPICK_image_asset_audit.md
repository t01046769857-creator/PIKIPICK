# PIKIPICK 이미지 에셋 전수 조사 및 정리 계획

- 조사 시각: 2026-11-20 (Asia/Seoul)
- 조사 대상: 프로젝트의 PNG/JPG/JPEG/WebP/GIF/SVG
- 제외: node_modules, .git, .chrome-terrain, .tmp* 브라우저/분석 프로필, dist, build, coverage, 캐시 폴더
- 원칙: 파일 이동·이름 변경·삭제·코드/CSS 수정 없음. 원본과 실패 시안 모두 보존.

## 1. 전체 현황

| 항목 | 결과 |
| --- | ---: |
| 이미지 파일 | 431 |
| 총 용량 | 246,138,943 bytes (약 234.7 MiB) |
| PNG | 428 |
| JPG/JPEG | 3 |
| WebP/GIF/SVG | 0 |
| frontend/public | 폴더 없음 |
| 행별 원본 데이터 | image-assets.csv |

CSV의 alpha는 PNG 헤더의 알파 채널 또는 tRNS 존재 여부를 기록한 값입니다. alpha-capable은 투명 픽셀이 존재할 수 있다는 뜻이며, 이미지 전체가 실제로 투명하다는 뜻은 아닙니다. 불투명 참고 시안은 별도로 분류했습니다.

## 2. 핵심 런타임 참조

- 공통 피키: src/assets/characters/piki/expressions 9장, gestures 3장, hands 3장, assetMap.ts를 통해 사용.
- 인트로: backgrounds/piki-playground-intro-background.png, intro-layers의 play-start body/hand, 표현 에셋.
- 놀이 선택: game-selection PNG 6장.
- 상상표현놀이: imagination/themes PNG 5장.
- 게임 팝업: menu-icons/popup-replace PNG 6장. 상위 폴더의 clean 파일은 현재 팝업 import가 아닙니다.
- 비밀나라 캐릭터: 정지 PNG, 좌우 원본 설정, walk-v2/left 4장, walk-v2/right 4장. 현재 이동 프레임은 walk-v2를 사용합니다.
- 배지: badges/collection/badge-art-01.png~40.png가 import.meta.glob으로 런타임 로드됩니다. badge_concept_02-clean.png, 03-clean.png는 기존 매핑의 보조 참조입니다.
- 비밀나라 랜드마크: world-design/02_landmark_candidates의 새싹·샘·구름·별빛 PNG 4장이 secretLandAssets.worldDesignLandmarks를 통해 월드 레이어에 연결되어 있습니다.
- 승인 다리 원본: world-terrain-compact-rainbow-bridge-v3-2400x800.png는 secretLandAssets.ts에 보존된 정적 참조입니다. 신규 코드 기반 월드에서는 승인 불투명 배경을 다시 연결하는 방식으로 사용하지 않습니다.

## 3. 분류 결과

### ACTIVE

현재 소스 import, asset map, glob, 또는 활성 랜더링 경로에서 확인된 에셋입니다.

- 공통 피키 expressions/gestures/hands
- 인트로 배경 및 intro layer
- game-selection 6장
- imagination themes 5장
- popup-replace 6장
- badge collection 40장과 실제 매핑된 clean badge 보조 파일
- 비밀나라 정지/걷기 v2 및 활성 랜드마크 후보 4장
- 보물상자·배지 도감 UI 이미지

정적 import가 있다는 것과 현재 화면에서 직접 보인다는 것은 다를 수 있습니다. 특히 secretLandAssets의 일부 legacy destination/world import는 설정 보존용이며 활성 JSX의 신규 월드 레이어와 직접 동일하지 않습니다.

### REQUIRED

현재 런타임 보호 또는 신규 월드 작업에 필요한 후보입니다.

- 승인된 무지개 다리 원본
- 4개 투명 랜드마크 후보
- 비밀나라 기존 place 에셋과 월드 asset manifest
- 현재 사용 중인 피키 정지·걷기 원본
- 배지·메뉴·게임 선택의 실제 사용 에셋

### REFERENCE

디자인·좌표·브라우저 검증을 위한 자료입니다.

- world-design/00_overview, 01_zone_references, 03_common_path_reference, 04_layout_and_coordinates
- frontend/artifacts/secret-land/connector-diagnostic-v1
- connector-review-v1, connector-review-v3의 seam/overview/reference 자료
- connector-transition-reconstruction-concepts
- frontend/docs/screenshots, 루트의 artifacts-*.png
- frontend/artwork, frontend/piki, 캐릭터 references
- walk-v3-review prepared/original/preview

공통 경로 참고 PNG 12장은 manifest 기준으로 불투명 reference-only이며 런타임 투명 장식으로 바로 배치할 수 없습니다.

### ARCHIVE

- badges/backups/badge-before-replace-20261119-135042
- characters/piki/adventure/backups/pre-walk-v2
- menu-icons/backups
- 기존 이미지 복사본과 보호용 백업

### FAILED

- src/assets/secret-land/connectors-review-v1
- src/assets/secret-land/drafts
- v3 connector review의 보정 PNG

이들은 삭제 대상이 아니라 경계 왜곡·반복·런타임 부적합을 기록하는 실패/보류 시안입니다.

### DUPLICATE

SHA-256 기준 76개 중복 그룹, 152개 파일이 확인되었습니다. 대표 그룹은 다음과 같습니다.

- 배지 원본과 badges/backups의 동일 파일 다수
- 팝업 메뉴 원본과 백업의 동일 파일
- frontend/piki와 src/assets/characters/piki/references의 동일 reference
- 승인 다리 원본과 connector review reference
- 좌우 connector 원본과 v3 reference
- 일부 검증 캡처와 좌표 캡처

정확한 해시는 image-assets.csv의 sha256·duplicate_group 열을 기준으로 확인해야 하며, 이번 단계에서는 보존합니다.

### UNKNOWN

현재 소스의 파일명/경로 참조가 없고 폴더 의미만으로는 런타임 여부를 확정할 수 없는 일부 루트 캡처·이전 검수 출력입니다. UNKNOWN은 삭제 후보가 아니라 보류 목록입니다.

## 4. 폴더별 집계

세부 파일별 집계는 image-assets.csv의 path prefix를 기준으로 합니다. 주요 폴더는 다음과 같습니다.

| 폴더 | 파일 수 | 용량(bytes) |
| --- | ---: | ---: |
| frontend 루트 캡처 | 17 | 10,933,523 |
| artifacts/intro-continuous | 6 | 3,725,419 |
| artifacts/secret-land/connector-diagnostic-v1 | 6 | 1,947,692 |
| artifacts/secret-land/connector-review-v1 | 9 | 8,308,487 |
| artifacts/secret-land/connector-review-v3 | 10 | 30,060,561 |
| artifacts/secret-land/connector-transition-reconstruction-concepts | 2 | 6,757,461 |
| artifacts/secret-land/coordinates | 7 | 3,081,428 |
| docs/screenshots | 47 | 9,438,421 |
| src/assets 전체 | 300+ | 약 174MB |

문서 캡처의 세부 합계는 CSV를 우선 기준으로 삼습니다.

## 5. 정리 후보와 위험도

| 후보 | 현재 판단 | 위험 | 제안 |
| --- | --- | --- | --- |
| 동일 SHA-256 백업 복제본 | 중복 확인 | 낮음~중간 | 별도 승인 후 archive 이동; 현재 보존 |
| connector v1/v3 보정 PNG | 실패/보류 시안 | 낮음 | 삭제하지 말고 reviews/archive로 분류 |
| walk-v3 review | 미적용 검수본 | 중간 | walk-v2와 비교 문서 확인 후 보류 |
| world-design 공통 경로 참고 | 불투명 reference | 중간 | 투명 런타임 장식으로 자동 사용 금지 |
| 루트 캡처·docs 캡처 | 증거/검수자료 | 중간 | 대표 캡처 보존 기준 확정 후 정리 |
| 이름만 비슷한 시각적 변형 | 해시 불일치 | 높음 | 시각 검토 없이 중복/삭제 판정 금지 |

이번 단계의 안전한 조치는 없습니다. 실제 파일 이동·삭제·이름 변경은 하지 않았습니다.

## 6. 신규 월드 제작에 직접 반영할 조사 결론

- 승인된 2400×800 불투명 다리와 좌우 불투명 connector를 다시 이어 붙이는 방식은 FAILED/REFERENCE로 남겨야 합니다.
- 신규 런타임은 코드 기반 SVG 레이어로 하늘·원경·잔디·강물·흙길·독립 무지개 아치·전환 식생을 분리하고, 투명 랜드마크 4장만 이미지 레이어로 재사용하는 구성이 가능합니다.
- 현재 27개 Catmull-Rom 경로를 흙길 SVG의 동일한 path 데이터로 사용하면 배경 흙길과 이동 경로의 형상 불일치를 추가 좌표 변경 없이 줄일 수 있습니다.
- 기존 ADVENTURE_WALK_SPEED=100, 27개 노드, 해금·재입장·카메라·발 접지 코드는 보호 대상입니다.
- 별도 투명 나무/수풀/꽃 에셋은 확인되지 않았습니다. 전환 식생은 현재 구현의 코드/SVG 레이어를 사용하거나 향후 투명 장식 PNG를 제작해야 합니다.
- world-design/03_common_path_reference의 PNG는 불투명하므로 신규 월드에 그대로 img로 배치하면 안 됩니다.

## 7. 권장 향후 폴더 구조

기존 경로를 지금 이동하지 않고 다음 구조를 다음 정리 작업의 목표로 제안합니다.

frontend/
  src/assets/                 # 런타임 import 대상
  design-references/          # 승인/참고 원본(이동은 별도 승인)
  artifacts/
    asset-audit/              # 이번 CSV·Markdown
    secret-land/
      baseline/
      unresolved/
      final/
      archive/
  docs/                       # 브라우저 검증 문서

.gitignore 변경은 이번 범위가 아니므로 제안만 남깁니다. 향후에는 검증 캡처를 artifacts/ 아래에 저장하고, 동일 시나리오·해상도·커밋 식별자를 파일명에 포함하며, baseline/unresolved/final 보존 규칙을 정하는 것이 안전합니다.

## 8. 다음 정리 순서

1. CSV 해시로 동일 복제본을 검토하고 보호 원본·대표 증거를 먼저 고정
2. 현재 코드의 static import와 import.meta.glob을 기준으로 ACTIVE 목록을 동결
3. FAILED/REFERENCE를 archive로 이동하기 전에 브라우저 재현·문서 참조 확인
4. CSS/코드 정리는 이미지 정리와 분리하고, 각 단계마다 build/test/브라우저 확인
5. 신규 월드 구현은 이번 조사에서 확인된 ACTIVE/REQUIRED 에셋만 재사용

## 9. 조사 시점의 변경 내역

- 생성한 파일: frontend/artifacts/asset-audit/image-assets.csv, 이 보고서
- 이미지 이동/삭제/이름 변경: 없음
- 코드/CSS 수정: 에셋 조사 단계에서는 없음
- 기존 Git 변경사항: 보존

