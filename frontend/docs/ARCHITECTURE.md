# PIKIPICK 1차 구조

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
