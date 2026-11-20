# FEATURE-034 · LXP 놀이 경험 카드

## 목적

상단 배지 미리보기와 하단 놀이 경험을 분리해 같은 배지 아이콘이 반복 표시되지 않도록 한다.

## 구현

- `LxpSecretLandDashboard.tsx`의 활성 대시보드에서 하단 오른쪽 카드를 `PlayMemoryCard`로 분리했다.
- `successCount`가 있으면 손동작 아이콘과 `오늘도 같이 놀았네!`를 표시한다.
- 성공 기록은 없고 `roundCount`가 있으면 첫 놀이 메시지를 표시한다.
- 기록이 없으면 피키가 기다리는 상태와 `우리의 첫 추억을 만들어 볼까?`를 표시한다.
- 배지 아이콘은 상단 최근 배지 미리보기와 배지함에서만 표시한다.

## 보존 범위

배지 획득·페이지 이동, 모험길 진행, 게임 규칙, API, DB, LMS는 변경하지 않았다.

## 검증

`npm.cmd run build`, `npm.cmd run test -- --run`, `git diff --check` 통과.
