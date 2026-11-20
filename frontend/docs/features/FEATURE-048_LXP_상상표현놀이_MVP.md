# FEATURE-048 — 상상표현놀이 MVP

## 목적

기존 놀이 선택 화면의 오른쪽 아래 카드를 활용해, 가위·바위·보 손동작을 고르고 색과 무늬로 꾸미는 자기주도 표현 놀이의 최소 실행 흐름을 제공한다. 청개구리 규칙 놀이는 포함하지 않는다.

## 구현 파일

- `src/components/ActivitySelection.tsx`: 기존 마지막 준비 중 카드를 `상상표현놀이`로 교체하고 색연필·손동작 일러스트와 안내 문구를 추가했다.
- `src/components/ActivitySelection.css`: 기존 카드 규격 안에서 색연필 장식을 추가했다.
- `src/components/ImaginationExpressionPlay.tsx`: 손동작 선택, 꾸미기, 완성, 작품 보기 흐름을 구현했다.
- `src/components/ImaginationExpressionPlay.css`: 기존 `play-card` 안에서 사용하는 놀이 전용 반응형 스타일을 정의했다.
- `src/game/types.ts`, `src/game/reducer.ts`, `src/App.tsx`: 기존 화면 전환 방식에 `IMAGINATION_EXPRESSION` 단계를 연결했다.
- `src/components/StoryNavigation.tsx`, `src/components/StoryNavigation.css`, `src/App.tsx`: 게임 화면 우측 상단 팝업 메뉴의 오른쪽 아래 여섯 번째 칸에 기존 상상표현놀이 화면으로 연결되는 메뉴 항목을 추가했다. 기존 5개 메뉴의 순서와 기능은 유지했다.

## 동작 및 데이터 경계

작품은 `pikipick.imagination-expression.works.v1` 키로 브라우저 `localStorage`에 보관한다. 현재 MVP는 작품을 FastAPI/TiDB 놀이 기록으로 전송하지 않으며, 기존 가위바위보 성공·파티 기록이나 게임 규칙을 변경하지 않는다. 작품 목록은 최대 24개를 최근 완성순으로 유지한다.

꾸미기는 포인터 이벤트를 사용하므로 마우스와 터치에서 동일하게 동작한다. 선택한 색과 무늬로 손동작 주변에 장식을 찍고, 실행 취소·다시 시작·완성·작품 재열람을 지원한다.

## 검증

- `npm.cmd test -- --run`: 12개 테스트 파일, 62개 테스트 통과
- `npm.cmd run build`: TypeScript와 Vite 빌드 통과
- 브라우저 자동화 도구는 이 환경에 설치되어 있지 않아 실제 포인터 입력과 모바일 화면 캡처는 미검증이다.

## 남은 범위

작품의 서버 동기화, LMS 분석 지표, 보호자 연결 및 콘텐츠별 이벤트 기록은 이번 MVP 범위에 포함하지 않는다. 이후 연결할 경우 별도 이벤트 계약과 개인정보 보관 정책 검토가 필요하다.
