# FEATURE-003 — 별 보상과 누적 기록

- 문서 목적: 성공 별, 5개 파티, 브라우저 저장이 어떻게 분리되어 유지되는지 설명합니다.
- 관련 기능: 성공 수, 파티 수, 기록 초기화
- 현재 상태: 구현됨·미검증
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`SuccessStars.tsx`](../../src/components/SuccessStars.tsx), [`reducer.ts`](../../src/game/reducer.ts), [`records.ts`](../../src/game/records.ts)
- 관련 문서: [FEATURE-002](FEATURE-002_가위바위보_규칙과_상태.md)

## 무엇인가요?

성공하면 별을 하나 얻고, 다섯 번째 별에서는 잠시 완성된 별판과 파티 반응을 보여 준 뒤 다음 다섯 별 묶음을 시작합니다. 전체 성공 수와 완성한 파티 수는 별도 값으로 유지됩니다.

## 핵심 코드

```ts
const successCount = state.successCount + (result.success ? 1 : 0);
const partyCompleted = result.success && successCount % 5 === 0;
```

성공일 때만 누적 성공 수를 늘립니다. 5의 배수일 때만 `partyCount`와 `celebrationId`를 한 번 증가시킵니다. 입력이 이미 `RESULT`라면 reducer가 새 결과를 만들지 않으므로 같은 파티가 중복 실행되지 않습니다.

```ts
window.localStorage.setItem(recordsStorageKey, JSON.stringify({
  successCount: state.successCount,
  partyCount: state.partyCount,
}));
```

`App.tsx`는 성공 수 또는 파티 수가 바뀔 때만 저장합니다. `CLEAR_RECORDS`를 실행할 때만 두 값을 0으로 만듭니다.

## 실행 순서

1. reducer가 정답 여부를 판단합니다.
2. 성공이면 `successCount`를 1 증가합니다.
3. 5의 배수라면 파티 식별자를 증가시켜 화면과 효과가 한 번 반응합니다.
4. `SuccessStars`가 현재 별 묶음과 전체 성공 수를 표시합니다.
5. `useEffect`가 `localStorage`의 `pikipick.records.v1` 키에 성공/파티 수를 저장합니다.
6. 다음 방문 시 `readSavedRecords`가 이 두 수를 초기 state에 합칩니다.

## 주의점과 검증

- ★ 현재 저장 대상은 성공 수와 파티 수뿐입니다. 현재 문제·모드·결과는 저장하지 않습니다.
- ! 브라우저의 private mode나 저장 공간 오류는 게임을 멈추지 않도록 조용히 무시합니다.
- `reducer.test.ts`에는 4·5·6·10·11회 성공 시 별/파티 상태를 확인하는 테스트가 있습니다.
- 현재 환경에서 테스트와 실제 새로고침 저장을 실행하지 못했으므로 상태는 **구현됨·미검증**입니다.
