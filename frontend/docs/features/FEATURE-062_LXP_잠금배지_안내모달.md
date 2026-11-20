# LXP 잠금 배지 안내 모달

## 변경 목적

미획득 배지를 눌렀을 때 브라우저 기본 alert 대신 기존 배지 상세 모달의 시각 구조를 유지하고, 안내 문구와 배지함 이동 버튼만 보여 준다.

## 변경 파일

- `frontend/src/components/LxpSecretLandDashboard.tsx`
- `frontend/src/components/LxpSecretLandDashboard.css`
- `frontend/src/assets/badges/badgeAssets.ts`

## 실제 구현

- 잠금 카드 클릭 시 기존 `secret-detail-backdrop` 및 `secret-detail` 레이어를 사용한다.
- 모달에는 선택된 배지 이미지, `아직 만나지 않았어요`, `배지함으로`만 표시한다.
- 배지 이름, 설명, 획득 조건은 잠금 안내 모달에서 렌더링하지 않는다.
- `window.alert`는 사용하지 않는다.
- 배지 카드 내부의 보조 설명은 기존 도감 카드 스타일에서 숨기고, 배지 이름과 잠금 상태는 유지한다.

## 검증

- Vitest: 13개 파일, 71개 테스트 통과
- Vite build: 통과
- 브라우저: 잠금 카드 클릭 후 모달 표시, alert 호출 없음, 모달 텍스트가 `아직 만나지 않았어요`와 `배지함으로`로 제한됨
- 배지 도감 카드 이미지 6개 로드 및 아트 박스 76×76px 확인

## 남은 문제

36개 도감 콘셉트 중 첫 4개를 제외한 일부는 의미가 정확히 일치하는 전용 원본 PNG가 없어 가장 가까운 기존 카탈로그 이미지를 연결한 상태다. 정확한 의미 매칭이 필요하면 해당 배지 전용 PNG를 추가 제작해야 한다.
