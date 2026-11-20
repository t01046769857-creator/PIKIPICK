# FEATURE-041 — 비밀나라 최종 아트 적용

## 목적

기존 LXP 비밀나라의 동작 구조를 유지하면서 탐험가 피키와 동화책풍 모험 풍경을 독립 레이어로 적용했다.

## 추가 에셋

- `frontend/src/assets/characters/piki/adventure/piki-explorer-adventurer.png`
  - 첨부된 탐험가 피키 참고 이미지 기반 투명 PNG
  - 기존 `traveler` 이동 래퍼에만 매핑
- `frontend/src/assets/backgrounds/secret-land-adventure-world.png`
  - 숲·언덕·폭포·시냇물·무지개 다리 분위기의 지도 풍경 레이어
  - 피키·목적지·텍스트가 포함되지 않은 배경 전용 에셋

## 변경 파일

- `frontend/src/components/LxpSecretLandDashboard.tsx`
- `frontend/src/components/LxpSecretLandDashboard.css`

## 동작 보존

피키의 이동 좌표, 카메라 추적, 목적지 해금, 클릭 이동, 더블클릭 점프, 배지·놀이 기록 데이터 흐름은 변경하지 않았다. 변경된 것은 탐험가 PNG 매핑과 풍경·보물상자·마법책의 시각 레이어다.

## 검증

- 1440×900 실제 브라우저 캡처에서 탐험가 피키, 풍경 레이어, 경로, 목적지 라벨, 상단·하단 카드 표시 확인
- `npm.cmd run build`: 통과
- Vitest: 11개 파일, 57개 테스트 통과
- `git diff --check`: 통과

## 남은 문제

현재 실제 원본 아트 파일이 아닌 첨부 참고 이미지를 기반으로 생성한 독립 에셋을 사용했다. 1280×800, 1024×768, 768×1024, 390×844에서의 실제 입력 동작과 모든 카메라 구간은 추가 수동 검증이 필요하다.
