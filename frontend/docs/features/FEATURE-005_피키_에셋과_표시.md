# FEATURE-005 — 피키 에셋과 공통 표시

- 문서 목적: 피키 이미지가 어디에 있고 화면에서 어떻게 공통으로 선택되는지 설명합니다.
- 관련 기능: 표정, 가위바위보 손동작, 인트로 레이어
- 현재 상태: 구현됨·미검증
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`assetMap.ts`](../../src/assets/characters/piki/assetMap.ts), [`PikiCharacter.tsx`](../../src/components/PikiCharacter.tsx)
- 관련 문서: [피키 캐릭터 가이드](../PIKI_CHARACTER_GUIDE.md) · [리깅 분석](../PIKI_RIGGING_ANALYSIS.md)

## 무엇인가요?

표정과 손동작 이미지의 파일 경로를 한 파일에서 관리하고, 화면은 파일 이름 대신 `expression="curious"` 또는 `gesture="ROCK"`처럼 의미 있는 상태를 전달합니다.

## 구현 파일

| 파일/폴더 | 역할 |
|---|---|
| `assets/characters/piki/expressions/` | 기본·성공·호기심·놀람·장난·응원과 인트로 포즈 PNG |
| `assets/characters/piki/gestures/` | 바위·가위·보 PNG |
| `assets/characters/piki/assetMap.ts` | 에셋 import, 타입, 대체 텍스트를 중앙 관리 |
| `components/PikiCharacter.tsx` | 표정 또는 손동작을 하나의 이미지 컴포넌트로 표시 |
| `assets/characters/piki/intro-layers/` | 인트로 손 내밀기용 레이어. 현재 작업 폴더에서 사용 중 |

## 핵심 코드

```tsx
const source = gesture ? pikiGestures[gesture] : pikiExpressions[expression];
return <img src={source} alt={pikiAssetLabels[state]} draggable="false" />;
```

게임 화면은 이미지 파일 경로를 직접 알 필요가 없습니다. 디자인 교체가 필요하면 `assetMap.ts`에서 같은 상태에 연결된 파일을 바꿀 수 있습니다.

## 중요한 결정

- ★ 피키 A번의 외형 기준은 [PIKI_CHARACTER_GUIDE.md](../PIKI_CHARACTER_GUIDE.md)에 따릅니다.
- ! `rig/` 폴더의 독립 파츠는 과거 분석 자료이며, 현재 라이브 인트로에서 승인된 완성형 리깅으로 취급하면 안 됩니다.
- ~ 인트로는 전체 표정 PNG와 손 레이어 조합을 함께 사용하도록 수정 중입니다. 최종 시각 품질은 브라우저 검증 전입니다.

## 검증 결과

경로와 타입 연결은 코드에서 확인했습니다. 각 PNG의 투명 배경·시각적 일관성 및 화면별 표시 품질은 이번 환경에서 브라우저 검증하지 못해 **구현됨·미검증**입니다.
