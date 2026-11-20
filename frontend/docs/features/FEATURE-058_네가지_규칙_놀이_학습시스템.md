# 네 가지 규칙 놀이 학습 시스템

## 목적

기존 가위바위보 화면을 변경하지 않고 묵찌빠, 수 세기 놀이, 숫자 놀이, 패턴·순서 놀이를 규칙 중심의 단계형 놀이로 추가했다.

## 구현 파일

- `src/game/learning/types.ts`: 놀이 ID, 단계, 진행 기록 타입
- `src/game/learning/storage.ts`: `pikipick.learning-progress.v1` 브라우저 저장소, 복구 가능한 기본값, 단계 제안
- `src/game/learning/mukJjiPpa.ts`: 공격권·같은 손 규칙 엔진
- `src/game/learning/counting.ts`: 0~10 손가락 몸풀기와 11~50 실제 사물 개수 문제 생성
- `src/game/learning/numbers.ts`: 빠진 숫자·비교·덧셈·뺄셈·혼합 문제
- `src/game/learning/patterns.ts`: 매칭·AB·AAB/ABB/ABC·복합 패턴 문제
- `src/components/LearningGames.tsx/.css`: 공통 진행 UI와 놀이별 렌더링
- `src/components/ActivitySelection.tsx`: 네 놀이 카드의 실행 연결과 ‘수 세기 놀이’ 이름
- `src/App.tsx`, `src/game/reducer.ts`, `src/game/types.ts`: 학습 놀이 화면 경로와 선택 상태

## 기록 방식

기존 `pikipick.records.v1`를 건드리지 않고 별도 키를 사용한다. 게임별로 현재 단계·문제 위치·시도·정답·힌트·사물 터치 횟수·관찰한 규칙·최근 결과·마지막 문제 정보를 저장한다. 로그인이나 서버 기능은 추가하지 않았다.

오답은 탈락이나 감점으로 처리하지 않고 다음 문제로 이어갈 수 있다. 최소 3회 시도와 힌트 없이 2회 이상 규칙 적용을 관찰하면 다음 단계 제안을 표시한다. 단계는 언제든 다시 선택할 수 있다.

## 시간·음원

경과 시간은 참고용으로만 표시하고 시간 초과로 실패시키지 않는다. 프로젝트에 연결할 승인 음원이 없으므로 외부 음원은 추가하지 않았고, 음악 연결 없이도 놀이가 계속되도록 구현했다.

## 검증

- `npm.cmd run build`: 통과
- `npm.cmd run test`: 13개 파일, 69개 테스트 통과
- 기준 서버 `http://127.0.0.1:5173`
- 놀이 선택 화면에서 네 카드 실행 확인
- 각 놀이의 문제·힌트·응답·피드백·놀이 고르기 복귀 확인
- 390px 화면에서 6개 카드와 가로 오버플로 확인
- 캡처: `artifacts/learning-games-selection.png`, `artifacts/learning-games-selection-mobile.png`, `artifacts/learning-mukjjippa.png`

## 남은 작업

- 실제 승인 음원이 없으므로 노래·리듬 재생은 연결 대기 상태다.
- 피키별 반응 애니메이션과 드래그·배치형 패턴 문제는 현재 MVP 범위에서 추가 제작이 필요하다.
- 실제 장기 사용자 관찰을 반영한 단계 승급 기준은 운영 데이터가 쌓인 뒤 조정해야 한다.
