# PIKIPICK 비밀나라 신규 연속 월드 구현

## 변경 목적

기존의 불투명 연결 배경 PNG를 경계에서 이어 붙이는 방식을 런타임에서 사용하지 않고, 9000×900 월드를 하나의 좌표계 안에서 코드 기반 레이어로 구성했다. 기존 27개 Catmull-Rom 경로와 탐험지·이동 시스템은 유지한다.

## 에셋 조사 결과

- 조사 이미지: 431개, 총 246,138,943 bytes (약 234.7 MiB)
- 결과물: `frontend/artifacts/asset-audit/image-assets.csv`, `frontend/artifacts/asset-audit/PIKIPICK_image_asset_audit.md`
- 런타임 ACTIVE 에셋과 보존이 필요한 REQUIRED/REFERENCE 에셋을 분리해 기록했다.
- 이번 월드 구현에서는 기존 연결 배경 후보(`connectors-review-v1`, v3)를 런타임에 연결하지 않았다.
- 기존 승인 무지개 다리 PNG는 삭제·수정하지 않고 `secretLandAssets.ts`의 보호된 정적 참조로 유지했다.
- 투명 랜드마크 4종은 `secretLandAssets.worldDesignLandmarks`를 통해 신규 월드 레이어에서 재사용했다.

## 구현 파일

### `frontend/src/components/LxpSecretLandDashboard.tsx`

`WorldTerrainLayer`를 활성 `LivingPath` 안에 배치했다. 레이어는 모두 같은 9000×900 좌표계를 사용한다.

1. 하늘 그라디언트와 먼 언덕
2. 가까운 언덕과 잔디 지형
3. 강둑·강물·물결 하이라이트
4. 무지개 아치·독립 데크·저지대 장식
5. 좌우 숲길 전환 canopy/understory
6. 탐험지 랜드마크 PNG 4종
7. 기존 27개 경로에서 생성한 흙길 SVG
8. 기존 피키 렌더링 레이어

흙길과 다리 데크는 동일한 `adventureRoutePath()`를 사용하므로, 배경 장식용 경로와 실제 이동 경로가 별도 좌표로 어긋나지 않는다. 기존 27개 노드, 5개 탐험지, `ADVENTURE_WALK_SPEED = 100`은 변경하지 않았다.

### `frontend/src/components/LxpSecretLandDashboard.css`

신규 레이어의 z-index와 표시 영역을 다음 순서로 정리했다.

`background → bridge → transition forest → terrain path → landmark → traveler`

레거시 CSS 지형·SVG 경로·승인 배경 이미지의 런타임 표시 규칙은 숨겨 중복 지형이 겹치지 않게 했다. 월드의 transform/overflow는 기존 카메라 좌표계를 유지한다.

### `frontend/src/components/LxpSecretLandDashboard.test.tsx`

이전 승인 배경 이미지 클래스 기대값을 제거하고, 신규 `world-background`, `world-bridge`, `world-transition-forest`, `terrain-path` 레이어와 승인 배경의 런타임 비사용을 검증하도록 최소 갱신했다.

## 유지한 기능

- 5개 탐험지 순서: 새싹 언덕 → 마법 샘 → 무지개 다리 → 구름 성 → 별빛 문
- 27개 경로 노드와 기존 Catmull-Rom 위치
- 월드 이동 속도 100px/s
- 방향키·마우스 이동, 잠긴 경계, 카메라 추적
- 피키 걷기·발 접지·점프 표현
- 해금 상태와 기존 저장 키
- 보물상자·배지 도감·인트로·다른 게임 화면

## 검증

### 자동 검증

- `npm.cmd run build`: 통과
- `npm.cmd run test`: 12개 파일 / 63개 테스트 통과

### 실제 브라우저 검증

기준 서버 `http://127.0.0.1:5173`의 CDP Chrome에서 `/play/world`를 열어 다음 뷰포트를 확인했다.

- 1440×900: 새 월드 레이어·랜드마크 4개·피키 렌더링 확인
- 1024×768: 동일 레이어 및 비율 확인
- 390×844: 모바일 레이아웃 및 월드 표시 확인

세 뷰포트 모두 `legacyApprovedBridgeCount = 0`, `legacyPathCount = 0`으로 확인했고, 문서 가로 스크롤은 발생하지 않았다. 검증 캡처와 측정값은 `frontend/artifacts/secret-land/new-world/`에 저장했다.

마우스 클릭으로 현재 위치에서 왼쪽 이동 목표를 설정한 뒤, ArrowRight·ArrowLeft를 각각 입력해 위치가 양방향으로 바뀌는 것을 확인했다. 테스트 중 변경한 위치 저장값은 원래 값(`0.5`)으로 복원했다.

개발용 terrain progress 검증으로 새싹 언덕(0), 마법 샘(.25), 무지개 다리(.5), 구름 성(.75), 별빛 문(1) 구간을 각각 캡처했다. 각 구간에서 해당 랜드마크가 카메라 영역에 들어오고 공통 경로 SVG가 렌더링되는 것을 확인했다. 캡처와 결과표는 `frontend/artifacts/secret-land/new-world/zone-*.png`와 `zone-checks.json`에 있다.

## 남은 문제

현재 지형·강물·무지개 다리 본체는 코드 기반 2D 스타일 레이어다. 향후 더 풍부한 동화풍 원화가 필요하면 에셋 조사에서 ACTIVE/REQUIRED로 보호한 투명 장식물을 좌표별로 추가할 수 있지만, 실패한 연결 배경 PNG를 다시 붙이는 방식은 사용하지 않는다.

## 2.5D 지형 개선

평면 SVG 도형만 보이던 문제를 줄이기 위해 기존 월드 좌표와 경로는 유지한 채 다음 시각 레이어를 추가했다.

- 잔디 지형: 불규칙한 잔디 하이라이트 패턴, 가장자리 광택, 미세한 grain 필터
- 흙길: 경로 그림자, 부드러운 가장자리, 흙 표면의 불규칙한 곡선 질감·돌·하이라이트를 분리
- 강물: 수면 반사 하이라이트 레이어
- 무지개 다리: 기존 코드 기반 다리 데크 위에 불규칙한 돌 표면 패턴을 추가
- 랜드마크 접지: 탐험지 기준점의 하단 그림자와 잔디 rim을 별도 레이어로 배치

런타임에 재사용한 실제 투명 에셋은 `secretLandAssets.worldDesignLandmarks`의 새싹 언덕·마법 샘·구름 지역·별빛 지역 랜드마크 4종이다. `03_common_path_reference`의 꽃·울타리·돌·흙길 PNG는 감사 결과 불투명 참고 이미지였으므로, 흰 배경이 그대로 들어가는 것을 막기 위해 런타임에 사용하지 않았다. 승인 무지개 다리 원본과 기존 캐릭터·경로·접지·카메라 로직은 변경하지 않았다.

## 2.5D 검증 결과

- 수정 전 기준 캡처: `frontend/artifacts/secret-land/new-world/desktop-flat-before.png`
- 수정 후 캡처: `frontend/artifacts/secret-land/new-world/desktop-full.png`
- 새싹 언덕·마법 샘·무지개 다리·구름 성·별빛 문 구간 캡처: `frontend/artifacts/secret-land/new-world/zone-*.png`
- 화면 측정 결과: `frontend/artifacts/secret-land/new-world/measurements.json`, `zone-checks.json`
- 1440×900, 1024×768, 390×844에서 월드 레이어와 4개 랜드마크 렌더링 확인
- 기존 승인 배경 세그먼트와 레거시 SVG 경로는 모두 0개로 확인
- 클릭 이동, ArrowRight/ArrowLeft 이동, 기존 위치 `0.5` 복원 확인

현재는 코드 기반 질감 레이어와 투명 랜드마크를 적용한 단계다. 더 풍부한 꽃·돌·수풀을 추가하려면 투명으로 정제된 개별 장식 PNG가 필요하며, 불투명 참고 시안을 그대로 배치해서는 안 된다.
