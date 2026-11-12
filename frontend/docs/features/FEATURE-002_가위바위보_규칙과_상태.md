# FEATURE-002 — 가위바위보 규칙과 상태 전환

- 문서 목적: 세 가지 규칙과 화면 진행이 어떻게 분리되어 동작하는지 설명합니다.
- 관련 기능: WIN/LOSE/DRAW, 중복 입력 방지, 자동 다음 문제
- 현재 상태: 구현됨·미검증
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`rules.ts`](../../src/game/rules.ts), [`reducer.ts`](../../src/game/reducer.ts), [`App.tsx`](../../src/App.tsx)
- 관련 문서: [규칙 문서](../GAME_RULES.md) · [사용자 흐름](../USER_FLOW.md)

## ① 무엇인가요?

아이의 바위·가위·보 선택과 피키의 손동작을 비교해, “이기기”, “지기”, “비기기” 목표를 달성했는지 판단합니다. 규칙 계산은 화면과 분리되어 있어 버튼 대신 미래 AI 인식 결과를 넣어도 같은 판정을 쓸 수 있습니다.

## ② 구현 파일

| 파일 | 역할 |
|---|---|
| `game/types.ts` | 가능한 손동작, 모드, 화면 단계의 TypeScript 타입 |
| `game/rules.ts` | 승패 비교, 모드별 성공 판정, 랜덤 피키 손 생성 |
| `game/reducer.ts` | 화면/문제/결과/누적 기록 상태를 한 곳에서 변경 |
| `game/input.ts` | 버튼 또는 향후 AI 입력을 같은 `GameInput` 형식으로 변환 |
| `App.tsx` | 버튼 이벤트, 결과 표시, 1.7초 자동 진행 |
| `rules.test.ts`, `reducer.test.ts` | 규칙 27조합과 상태 보호 테스트 |

## ③ 핵심 코드

```ts
export function isSuccessful(mode: GameMode, player: Gesture, opponent: Gesture): boolean {
  const comparison = compareGestures(player, opponent);
  if (mode === 'WIN') return comparison === 1;
  if (mode === 'LOSE') return comparison === -1;
  return comparison === 0;
}
```

`compareGestures`는 일반 가위바위보의 승/무/패만 반환하고, `isSuccessful`이 놀이 목표에 맞는 성공인지 정합니다. 따라서 화면 문구와 규칙 계산이 섞이지 않습니다.

```ts
if (state.phase !== 'PLAYING' || state.result || !state.mode || !isGesture(state.opponent)) return state;
```

`SUBMIT_INPUT`의 보호 조건입니다. 첫 입력 후 상태가 `RESULT`가 되면 이후 빠른 연속 클릭은 같은 상태를 그대로 반환하므로 성공 수가 중복 증가하지 않습니다.

## ④ 실행 순서

1. `START_ROUND`가 피키 손동작을 하나 정하고 `PLAYING`으로 바꿉니다.
2. 버튼은 `inputFromButton('ROCK')`처럼 표준 `GameInput`을 만듭니다.
3. `SUBMIT_INPUT`이 reducer에 전달됩니다.
4. reducer가 한 번만 `judgeRound`를 호출하고 `RESULT`를 저장합니다.
5. `App.tsx`가 성공/재도전 메시지를 표시합니다.
6. 1.7초 뒤 성공은 `NEXT_ROUND`, 실패는 `RETRY_ROUND`로 자동 전환합니다.

## ⑤ 추가·수정·삭제 기록

- ★ 초기 커밋 `3c60b58`에 규칙·reducer·테스트가 추가되었습니다.
- + `a10d519`에서 `GameInput`의 `source`, 자동 재도전/다음 문제, 기록 분리 관련 코드가 확장되었습니다.
- ~ `RESTART`는 현재 누적 기록을 지우지 않는 흐름으로 구현되어 있습니다.
- ! 실제 자동 진행 타이머는 브라우저에서 중복 실행 여부를 재확인해야 합니다.

## ⑥ 검증 결과

`rules.test.ts`는 3개 모드 × 피키 3손 × 사용자 3손, 총 **27개 조합**과 잘못된 입력 예외를 정의합니다. `reducer.test.ts`는 중복 입력, 실패 재도전, 성공 후 다음 문제, 5·10회 파티, 기록 보존·초기화를 정의합니다. 테스트 파일은 확인했지만 현재 환경에서 실행하지 못했으므로 결과 상태는 **구현됨·미검증**입니다.
