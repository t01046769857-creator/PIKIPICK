# PIKIPICK 코드 가이드

- 문서 목적: 개발 경험이 많지 않은 사람이 실제 PIKIPICK 코드와 연결해 React/TypeScript 구조를 이해하도록 돕습니다.
- 관련 기능: 화면, 상태, 이벤트, CSS, 에셋
- 현재 상태: 현재 코드 기준 작성됨
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src`](../src)
- 관련 문서: [아키텍처](ARCHITECTURE.md) · [기능 문서](features/README.md)

## React 컴포넌트란?

**개념:** 화면의 한 부분을 만드는 함수입니다.

**PIKIPICK에서:** `App`은 전체 화면 흐름, `PikiIntroScene`은 시작 장면, `PikiCharacter`는 피키 이미지, `SuccessStars`는 별 표시를 담당합니다.

**주의:** 컴포넌트를 나누면 같은 피키 표시 방식을 여러 화면에서 재사용할 수 있지만, 상태를 어디에서 관리할지 정해야 합니다. 현재 게임 상태의 중심은 `App.tsx`의 reducer입니다.

## Props는 왜 쓰나요?

**개념:** 부모가 자식 컴포넌트에 전달하는 값입니다.

**PIKIPICK에서:** `PikiCharacter expression="curious" size="medium"`은 “호기심 표정의 중간 크기 피키를 보여 달라”는 요청입니다. `PikiIntroScene onBegin={...}`은 손을 눌렀을 때 부모에게 알려 줄 함수를 전달합니다.

## State가 바뀌면 왜 화면이 바뀌나요?

**개념:** React state는 현재 상황을 저장합니다. state가 바뀌면 React가 해당 상태에 맞는 JSX를 다시 계산합니다.

**PIKIPICK에서:** `state.phase`가 `START`면 인트로를, `MODE_SELECT`면 놀이 선택을, `PLAYING`이면 가위바위보 패널을 보여 줍니다. 이 값은 `gameReducer`만 바꿉니다.

## 이벤트 핸들러란?

**개념:** 클릭, 터치 같은 일이 생겼을 때 실행되는 함수입니다.

**PIKIPICK에서:** 피키 손의 `onClick={beginPlay}`는 시작 요청을 만들고, 가위바위보 버튼의 `onClick`은 `SUBMIT_INPUT`을 reducer로 보냅니다.

## reducer는 왜 필요한가요?

**개념:** 현재 상태와 행동(action)을 받아 다음 상태를 만드는 한 곳의 규칙표입니다.

**PIKIPICK에서:** `SUBMIT_INPUT`은 `PLAYING`일 때만 판정합니다. 이미 결과가 있으면 이전 state를 돌려주므로 빠르게 여러 번 눌러도 성공 수가 중복 증가하지 않습니다.

## CSS의 relative와 absolute는 어떻게 다른가요?

**개념:** `relative` 요소는 일반 배치 흐름의 기준점이 될 수 있습니다. `absolute` 요소는 가까운 기준점 안에서 좌표로 배치됩니다.

**PIKIPICK에서:** 인트로의 큰 틀은 CSS Grid로 상단·중앙·하단 안전 영역을 만들고, 피키 손 레이어와 말풍선은 피키 캔버스 내부에서 `absolute`로 겹칩니다. 중요한 UI 전체를 모두 absolute로 배치하면 작은 화면에서 잘릴 위험이 있습니다.

## 이미지와 클릭 영역은 어떻게 연결되나요?

`PikiIntroScene`의 손 이미지와 `play-start-hand__target` 버튼은 같은 `.play-start-hand` 좌표계 안에 있습니다. 이미지는 보이고 버튼은 투명합니다. 따라서 사용자는 손을 누르는 느낌을 받지만 브라우저는 접근 가능한 `<button>`으로 처리합니다. 좌표가 바뀌면 이미지와 버튼을 함께 검증해야 합니다.

## 애니메이션 단계는 어떻게 관리되나요?

인트로는 `PEEK → NOTICE → HOLD → APPROACH → SETTLE → REACH → TALK → IDLE` 상태를 사용합니다. React state는 “어느 장면인가”만 바꾸고, CSS는 그 단계에 맞는 transform·opacity·animation을 적용합니다. 매 프레임 React state를 바꾸지 않는 이유는 불필요한 렌더링과 끊김을 줄이기 위해서입니다.

## 게임 규칙과 화면 UI를 왜 분리하나요?

`game/rules.ts`는 버튼·이미지·React를 모릅니다. 손동작 세 개만 받아 성공 여부를 돌려줍니다. 그래서 `rules.test.ts`가 화면 없이 27개 조합을 검사할 수 있고, 미래에 AI가 인식한 결과도 같은 규칙에 넣을 수 있습니다.

## 향후 설계

- `inputFromAI`는 이미 `source: 'AI'` 형식만 준비했습니다. MediaPipe 웹 카메라·FastAPI 연결은 아직 없습니다.
- Python MediaPipe 파일은 `mediapipe_hand/`에 있지만 React 앱과 연결된 코드 근거는 확인되지 않았습니다.
- MySQL/대시보드 기능은 현재 프론트엔드 코드에서 확인되지 않습니다.
