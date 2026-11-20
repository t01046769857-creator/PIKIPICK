# LXP 배지함 여백·배지 크기·잠금 안내 보정

## 변경 목적

배지함의 뒤로가기 버튼 아래 공간을 확보하고, 카드 배지의 표시 기준을 통일했다. 카드 아래에 반복되던 부제목은 숨기고, 잠긴 배지를 눌렀을 때 안내 팝업이 표시되도록 했다.

## 변경 파일

- src/components/StoryNavigation.css
- src/components/LxpSecretLandDashboard.css
- src/components/LxpSecretLandDashboard.tsx

## 구현 방식

- 배지함 전용 뒤로가기 행을 데스크톱 84px, 모바일 80px로 두고 12px 패딩을 네 방향에 적용했다.
- 배지 카드의 아트 박스를 76×76px로 통일하고 이미지에는 object-fit: contain을 적용했다.
- 배지 카드의 설명 small은 배지함 화면에서 표시하지 않는다.
- 잠긴 카드의 비활성 상태를 해제해 클릭할 수 있게 하고, 배지함 전용 잠금 안내를 표시한다. 획득 배지 선택 및 기존 데이터는 변경하지 않는다.

## 검증

- npm.cmd run test: 13개 파일, 71개 테스트 통과
- npm.cmd run build: 통과
- Chrome CDP 실제 화면: 배지함 진입, 잠금 배지 클릭 안내, 뒤로가기 행 높이 84px/패딩 12px, 배지 아트 76×76px 확인

## 남은 문제

잠금 안내는 현재 브라우저 기본 alert를 사용한다. 앱 내부 동화풍 모달이 필요하면 별도 UI 디자인 승인 후 교체한다.
