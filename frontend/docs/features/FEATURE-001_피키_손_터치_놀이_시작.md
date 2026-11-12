# FEATURE-001 — 피키 손 터치로 놀이 시작

- 문서 목적: 아이가 피키의 손을 눌러 인트로에서 놀이 선택으로 이동하는 방식을 설명합니다.
- 관련 기능: 피키 등장, 손 클릭, 말풍선, 선택적 음성
- 현재 상태: 개발 중
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`PikiIntroScene.tsx`](../../src/components/PikiIntroScene.tsx), [`styles.css`](../../src/styles.css), [`App.tsx`](../../src/App.tsx)
- 관련 문서: [인트로 Before/After](../before-after/intro.md) · [리깅 분석](../PIKI_RIGGING_ANALYSIS.md)

## ① 무엇인가요?

피키가 마지막에 내민 손을 아이가 누르면, 별도의 일반 시작 버튼을 찾지 않아도 가위바위보 놀이 선택 화면으로 이동하는 기능입니다.

## ② 왜 필요한가요?

기획 문서가 아닌 현재 UI 요구에서 확인되는 목적은, 글을 읽기 어려운 유아가 피키와 직접 상호작용하는 느낌으로 시작하도록 하는 것입니다.

## ③ 구현 파일

| 파일 | 역할 |
|---|---|
| `src/components/PikiIntroScene.tsx` | 인트로 단계, 손 클릭, 음성, 이미지 사전 로드 |
| `src/App.tsx` | `onBegin`을 받아 `BEGIN` 액션을 reducer로 전달 |
| `src/game/reducer.ts` | `START`에서 `MODE_SELECT`로 화면 상태 변경 |
| `src/styles.css` | 손 이미지 위치, 보이지 않는 클릭 범위, 안내 문구, 단계별 이동 |
| `assets/characters/piki/intro-layers/*` | 손 내밀기 완료 포즈의 본체와 왼쪽 손 레이어 |

## ④ 핵심 코드와 실행 순서

```tsx
const beginPlay = () => {
  if (isBeginning.current) return;
  isBeginning.current = true;
  setIsLeaving(true);
  leaveTimer.current = window.setTimeout(onBegin, reducedMotion ? 0 : 460);
};

<button
  className="play-start-hand__target"
  type="button"
  onClick={beginPlay}
  aria-label="피키 손을 눌러 놀이 시작"
/>
```

1. 인트로가 `IDLE`에 도달하면 손 레이어와 클릭 영역이 나타납니다.
2. 아이가 화면 왼쪽의 큰 손 위치를 누릅니다.
3. `beginPlay`가 한 번만 실행되도록 `isBeginning`이 중복 클릭을 막습니다.
4. 짧은 퇴장 연출 뒤 부모 컴포넌트의 `onBegin`이 실행됩니다.
5. `App.tsx`가 `BEGIN`을 전달하고 reducer가 `MODE_SELECT` 화면을 렌더링합니다.

`play-start-hand__target`은 보이는 별도 버튼이 아니라 손과 같은 좌표계에 놓인 투명 버튼입니다. 키보드 Tab 뒤 Enter/Space로도 표준 버튼 동작을 사용할 수 있습니다.

## ⑤ 추가·수정·삭제 기록

- ★ 현재 핵심: `play-start-hand__target`과 `beginPlay`가 실제 시작 동작을 연결합니다.
- + `a10d519`에서 인트로, 말풍선, 파츠/리깅 시도가 추가된 Git 근거가 있습니다.
- ~ 현재 작업 폴더에서는 왼쪽 큰 손용 `piki-intro-play-start-*` 레이어를 사용하도록 인트로가 수정 중입니다.
- - 이전 `PikiRig` 구성 요소는 현재 작업 폴더에서 삭제 상태입니다. 독립 파츠가 원본 외형을 깨뜨린 이유는 [리깅 분석](../PIKI_RIGGING_ANALYSIS.md)에 기록되어 있습니다.
- ! 현재 손의 실제 브라우저 좌표·클릭 범위 일치는 다시 검증해야 합니다.

## ⑥ 중요한 기술적 결정

전체 피키 PNG를 프레임마다 바꾸면 포즈·투명 여백 차이로 끊겨 보일 수 있습니다. 현재 코드는 등장 구간에서는 전체 표정 PNG를 사용하고, 손 내밀기 이후에는 본체와 왼쪽 손 레이어를 같은 캔버스에서 겹칩니다. 이 방식은 손 강조만 독립적으로 적용하려는 선택이지만, 실제 시각 품질은 아직 확정되지 않았습니다.

2026-11-12에 PEEK 단계의 수평 `clip-path`를 제거했습니다. 이 규칙은 캐릭터 캔버스 아래를 직선으로 잘라 얼굴 일부가 잘려 보이는 원인이었습니다.

같은 날 `expressions/piki-intro-peek-right.png`를 PEEK 전용 에셋으로 추가했습니다. 첨부된 오른쪽 빼꼼 포즈의 투명 배경을 보존한 파일이며, 캐릭터를 새로 그리거나 다시 자르지 않았습니다. PEEK는 약 2초 동안 오른쪽에서 안쪽으로 0.4초 이동하고, 약 0.7초 멈춘 뒤, 약 0.5초 다시 오른쪽으로 들어갑니다. 이후 기존 NOTICE 단계로 넘어갑니다.

에셋의 실제 캔버스는 1254×1254이고 보이는 피키는 x=534~1252에 있습니다. 오른쪽 경계가 캔버스 끝과 거의 같으므로 PEEK의 x 좌표는 `calc(50vw - 26%)`로 계산합니다. 이는 피키 무대의 중심(화면 50%)과 스케일된 캔버스 반폭(26%)을 더해, 보이는 에셋의 오른쪽 선이 화면 오른쪽 끝에 맞도록 한 값입니다. 기존 `25vw`/`18vw` 값은 이 내부 투명 여백을 고려하지 않아 피키가 미끄럼틀 근처에 남는 원인이었습니다. PEEK에는 `clip-path`나 mask를 사용하지 않습니다.

## ⑦ 검증 결과

**개발 중 / 브라우저 미검증**. 코드상 접근성 이름, 중복 클릭 방지, reduced-motion 분기가 존재합니다. 이번 문서화 환경에서는 Node/Vite 실행이 불가능해 클릭 이동과 실제 좌표를 재현하지 못했습니다.

## ⑧ 관련 자료

- Git: `7ee30c7`, `a10d519`, 그리고 현재 미커밋 인트로 변경
- [사용자 흐름](../USER_FLOW.md)
- [Before/After 규칙](../before-after/README.md)
