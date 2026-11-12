# FEATURE-004 — 개발용 반응 속도 계측

- 문서 목적: 버튼 입력부터 판정·화면 반영·다음 문제까지의 시간을 개발 중 확인하는 방법을 설명합니다.
- 관련 기능: 성능 계측, 개발자 도구 API
- 현재 상태: 구현됨·미검증
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`metrics.ts`](../../src/game/metrics.ts), [`App.tsx`](../../src/App.tsx)
- 관련 문서: [FEATURE-002](FEATURE-002_가위바위보_규칙과_상태.md)

## 무엇인가요?

유아 화면에 숫자를 표시하지 않고, 개발 모드에서만 반응 시간을 표본으로 모으는 기능입니다. 실제 측정 전에는 값이 없으며, 문서나 코드가 임의의 밀리초 수치를 만들지 않습니다.

## 측정 항목

| 이름 | 시작 | 끝 | 의미 |
|---|---|---|---|
| `ruleDecision` | 버튼 입력 시각 | reducer가 판정한 시각 | 규칙 계산·상태 변경까지 |
| `resultPaint` | 버튼 입력 시각 | 두 번째 animation frame | 결과가 그려진 뒤의 근사 시점 |
| `roundAdvancePaint` | 자동 다음/재도전 요청 | 두 번째 animation frame | 다음 문제 화면 반영까지 |

## 핵심 코드

```ts
const firstFrame = window.requestAnimationFrame(() => {
  secondFrame = window.requestAnimationFrame(() =>
    recordMetric('resultPaint', performance.now() - timing.startedAt),
  );
});
```

두 번의 브라우저 프레임을 기다리는 이유는 React가 상태 변경을 화면에 반영할 기회를 준 뒤 시간을 기록하기 위해서입니다. 이것은 화면이 “사용자에게 확실히 보였다”는 완벽한 보증은 아니며, 렌더링 완료를 근사하는 개발용 지표입니다.

## 사용하는 방법

개발 모드에서 `installMetricsDevtools()`가 실행되면 브라우저 콘솔에서 다음을 사용할 수 있습니다.

```js
window.__PIKIPICK_METRICS__.summary()
window.__PIKIPICK_METRICS__.reset()
```

`summary()`는 표본 수, 평균, 중앙값, p95, 최소·최대를 반환합니다. 최대 300개만 보관합니다.

## 검증 결과

`metrics.test.ts`는 `[1, 2, 3, 4, 100]` 표본의 평균 22, 중앙값 3, p95 100 계산을 정의합니다. 이번 환경에서 Vitest를 실행하지 못해 **구현됨·미검증**입니다. 실제 측정값은 개발 브라우저에서 여러 번 입력한 뒤에만 기록합니다.
