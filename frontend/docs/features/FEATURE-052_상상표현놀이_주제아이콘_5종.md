# FEATURE-052 상상표현놀이 주제 아이콘 5종

## 목적

상상표현놀이 시작 화면에서 다섯 가지 표현 주제를 이미지 중심으로 선택할 수 있게 한다.

## 적용 파일

- `src/assets/imagination/themes/expression-rps.png`
- `src/assets/imagination/themes/expression-mukjjippa.png`
- `src/assets/imagination/themes/expression-finger-count.png`
- `src/assets/imagination/themes/expression-numbers.png`
- `src/assets/imagination/themes/expression-patterns.png`
- `src/components/ImaginationExpressionPlay.tsx`
- `src/components/ImaginationExpressionPlay.css`

## 매핑 및 구현 상태

| 이미지 | 주제 | 현재 상태 |
| --- | --- | --- |
| `expression-rps.png` | 손동작 꾸미기 | 기존 가위·바위·보 꾸미기 편집기로 연결 |
| `expression-mukjjippa.png` | 묵·찌·빠 표현하기 | 아이콘과 `준비 중` 상태만 표시 |
| `expression-finger-count.png` | 손가락 수 표현하기 | 아이콘과 `준비 중` 상태만 표시 |
| `expression-numbers.png` | 숫자로 표현하기 | 아이콘과 `준비 중` 상태만 표시 |
| `expression-patterns.png` | 모양과 순서 표현하기 | 아이콘과 `준비 중` 상태만 표시 |

PNG 안에 주제명이 포함되어 카드에 별도 제목을 반복하지 않는다. 미구현 주제는 비활성 카드로 표시하며 기존 작품 저장·열람 기능과 `pikipick.imagination-expression.works.v1` 저장 키는 유지한다.

## 검증

- 5개 PNG의 512×512 RGBA 및 투명 배경 확인
- 데스크톱·모바일에서 `contain` 렌더링과 카드 반응형 확인 예정
- 주제별 실제 편집기 연결은 손동작 꾸미기만 지원하며 나머지는 미구현으로 보고한다.
