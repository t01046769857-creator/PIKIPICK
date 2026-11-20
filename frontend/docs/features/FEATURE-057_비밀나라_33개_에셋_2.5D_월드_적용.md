# 비밀나라 2.5D 환경 에셋 적용

## 목적

기존 9000×900 비밀나라의 SVG 지형은 경로·마스크·충돌 기준으로 유지하고, 화면에 보이는 주요 환경을 투명 RGBA PNG와 기존 고품질 랜드마크 중심으로 보강했다. 승인된 월드 크기, 27개 Catmull-Rom 노드, 100px/s 이동, 피키 접지·카메라·해금·저장 로직은 변경하지 않았다.

## 적용 파일

- `src/assets/secret-land/secretLandAssets.ts`
  - 환경 에셋을 `assetId`, `src`, `worldX`, `worldY`, `width`, `height`, `anchorX`, `anchorY`, `zIndex`, `zoneId`, `usage` 메타데이터로 관리한다.
  - 봄·성·문 환경은 기존 해금 상태가 열렸을 때만 표시해 잠긴 목적지를 컬러로 미리 노출하지 않는다.
- `src/components/LxpSecretLandDashboard.tsx`
  - 기존 `WorldTerrainLayer` 안에 환경 PNG를 월드 좌표로 렌더링한다.
  - 환경 이미지는 장식 레이어이며 이동 경로·진행 상태의 데이터 소스가 아니다.
- `src/components/LxpSecretLandDashboard.css`
  - 환경 PNG는 절대 좌표, `object-fit: contain`, 비상호작용으로 렌더링한다.
- `src/assets/secret-land/world-environment-v1/`
  - `sprout-path-foreground-cluster-v1.png`
  - `sprout-spring-path-strip-v1.png`
  - `magic-spring-waterbank-cluster-v1.png`
  - `rainbow-bridge-approach-cluster-v1.png`
  - `cloud-castle-approach-cluster-v1.png`
  - `starlight-gate-approach-cluster-v1.png`

## 33개 디자인 자료와의 관계

`world-design/04_layout_and_coordinates/asset_manifest.csv` 기준으로 전체 콘셉트 보드·구역 시안·공통 길 참고 이미지는 불투명 참고 자료이며, 그대로 런타임에 올리면 사각형 배경과 기준점 문제가 생긴다. 따라서 해당 원본은 보존하고, 기존 투명 `place-*` 랜드마크를 재사용하면서 필요한 지형·수변·전환 클러스터만 별도 투명 PNG로 제작했다. 원본 33개 파일은 삭제·이동·덮어쓰기하지 않았다.

무지개 다리 환경은 새 투명 클러스터를 별도 레이어로 추가했으며, 중복되는 SVG 다리 시각 레이어는 숨겼다. 이동 계산용 경로와 개발용 디버그 경로는 유지하고, 승인된 불투명 다리 원본은 교체하지 않았다.

## 전체 월드 중복 렌더링 정리

- 환경 PNG가 담당하는 구역에서는 동일 역할의 SVG 흙길 시각 세그먼트를 렌더링하지 않는다.
- 무지개 다리의 SVG 본체·난간·데크는 환경 클러스터가 활성화된 런타임에서 숨기고, 경로 계산에는 영향을 주지 않는다.
- 환경 PNG가 활성화된 탐험지에서는 기존 랜드마크와 지면 링을 생략해 동일한 그림이 겹치지 않도록 했다.
- 환경 PNG가 없는 구간의 fallback SVG 흙길은 유지하며, 27개 이동 경로 데이터와 개발용 경로 표시를 변경하지 않았다.

## 사용자 화면 변화

새싹 언덕과 마법 샘 구간에는 흙길, 꽃, 바위, 수풀, 물 요소가 포함된 2.5D 투명 클러스터가 표시된다. 다리 구간에는 별도 무지개 다리 접근 클러스터가 표시된다. 구름 성·별빛 문 클러스터는 해당 구역 해금 후 표시되며, 미해금 상태의 기존 회색 랜드마크 표현은 유지된다.

## 검증

- `npm.cmd run build`: 통과
- `npm.cmd run test`: 12개 파일, 63개 테스트 통과
- `node artifacts/secret-land/new-world/browser-check.mjs`: 통과
  - 1440×900, 1024×768, 390×844에서 가로 오버플로 없음
  - 환경 레이어가 월드 좌표로 렌더링됨
  - 클릭 이동·ArrowRight·ArrowLeft 입력이 모두 위치 변화를 발생시킴
  - 기존 이동·저장 위치 복원 확인
- 확인 캡처: `frontend/artifacts/secret-land/new-world/zone-sprout.png`, `zone-spring.png`, `zone-bridge.png`, `zone-castle.png`, `zone-gate.png`, `unlocked-full.png`

## 남은 문제

- 구역별 환경 PNG가 없는 연결 구간에는 기존 fallback SVG 지형이 남아 있어, 전체 월드가 동일한 고품질 PNG 지형으로 완전히 교체된 상태는 아니다.
- `debug=terrain` 캡처에는 개발용 경로 표시가 포함될 수 있다. 일반 플레이에서는 디버그 경로를 켜지 않아야 한다.
- 피키의 27개 경로·접지 기준은 이번 작업에서 변경하지 않았으므로, 환경 PNG 내부 보행면과의 픽셀 단위 정렬은 별도 아트 검수가 필요하다.
- 공통 path reference 12개는 불투명 참고 이미지이므로 직접 오버레이 에셋으로 사용하지 않았다. 개별 꽃·울타리·바위 등의 투명 런타임 에셋이 필요하면 별도 제작해야 한다.
