# PIKIPICK 아키텍처

- 문서 목적: 현재 코드가 어떤 층으로 나뉘어 있는지 설명합니다.
- 관련 기능: 인트로, 게임 규칙, 기록, 에셋
- 현재 상태: 현재 코드 기준 갱신됨
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src`](../src)
- 관련 문서: [프로젝트 개요](PROJECT_OVERVIEW.md) · [코드 가이드](CODE_GUIDE.md)

> 아래의 초기 구조 설명은 보존하되, 현재 구현은 다음 구조를 우선합니다.

```text
App.tsx
 ├─ PikiIntroScene (START)
 │   └─ onBegin → reducer BEGIN
 ├─ mode / instruction / ready screens
 └─ game screen
     ├─ PikiCharacter
     ├─ SuccessStars
     └─ reducer ← GameInput ← button / future AI adapter

game/
 ├─ rules.ts       순수 가위바위보 판정
 ├─ reducer.ts     화면·문제·누적 기록 상태 전환
 ├─ records.ts     localStorage 저장/복원
 ├─ metrics.ts     개발용 성능 표본
 └─ rhythm.ts      선택/축하 음향
```

현재 `PikiIntroScene`은 인트로 전용 상태를 자체 관리하고, 게임 진행 상태는 `App.tsx`의 `useReducer`가 관리합니다. 인트로의 최종 시각 구현은 수정 중이므로 [FEATURE-001](features/FEATURE-001_피키_손_터치_놀이_시작.md)을 함께 확인합니다.

## 폴더 구조

```text
frontend/
  src/
    components/SuccessStars.tsx  # 성공 숫자를 별 그림으로 바꾸는 UI
    game/types.ts                # 게임에서 주고받는 타입
    game/rules.ts                # React와 무관한 순수 규칙 함수
    game/feedback.ts             # 아이에게 보여줄 문구 모음
    game/reducer.ts              # 화면 단계와 게임 상태 변경
    App.tsx                      # 화면 조립과 버튼 이벤트 연결
    styles.css                   # 교체하기 쉬운 기본 스타일
  docs/
```

## 기술 선택 이유

- Vite는 개발 서버와 빌드를 가볍게 제공하는 도구입니다.
- TypeScript는 `ROCK`, `PLAYING` 같은 값의 오타를 개발 중에 찾도록 도와줍니다.
- `useReducer`는 여러 화면 단계와 성공 누적을 한 곳에서 안전하게 바꾸기 좋습니다.
- 게임 규칙은 순수 함수(화면이나 저장소에 의존하지 않는 함수)로 분리해 단독 테스트가 가능합니다.
- `GameInput`은 버튼과 향후 AI가 같은 `{ gesture, source }` 형식으로 엔진에 들어오게 하는 연결 지점입니다.

## 입력 확장 지점

현재 버튼은 `source: 'BUTTON'`으로 전달됩니다. 향후 Python/FastAPI 같은 API가 모델 예측 `ROCK | SCISSORS | PAPER`를 반환하면 같은 `GameInput`의 `source: 'AI'`로 `SUBMIT_INPUT`을 호출하면 됩니다. 카메라 권한, 인식 실패, API 재시도는 입력 어댑터 계층에서 처리하고 규칙 함수에는 인식된 손동작만 전달합니다.
