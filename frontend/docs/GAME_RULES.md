# 게임 규칙과 상태

- 문서 목적: 초기 가위바위보 규칙과 상태 단계를 보존합니다.
- 관련 기능: WIN/LOSE/DRAW 판정, reducer 상태 전환
- 현재 상태: 현재 코드 기준으로 일부 보완 필요
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src/game/rules.ts`](../src/game/rules.ts), [`../src/game/reducer.ts`](../src/game/reducer.ts)
- 관련 문서: [규칙과 상태 기능 기록](features/FEATURE-002_가위바위보_규칙과_상태.md)

> 이 문서는 초기 흐름을 설명합니다. 현재 화면은 결과 뒤 자동 진행을 사용하며, 누적 기록의 처리 방식은 FEATURE-002와 FEATURE-003을 우선합니다.

## 판정

`compareGestures`가 일반 가위바위보 승패를 판정하고, `isSuccessful`이 모드별 성공 여부를 판정합니다.

- 이기기: 플레이어 승리
- 지기: 플레이어 패배
- 비기기: 같은 손
- 청개구리: 준비 중이며 선택할 수 없음

## 상태 단계

| 단계 | 허용 행동 | 다음 조건 |
| --- | --- | --- |
| START | 놀이 시작 | `BEGIN` → MODE_SELECT |
| MODE_SELECT | WIN/LOSE/DRAW 선택 | 선택 → INSTRUCTION |
| INSTRUCTION | 규칙 확인 | 알겠어 → READY |
| READY | 문제 시작 | 시작 → PLAYING, 새 피키 손 생성 |
| PLAYING | 손동작 1회 제출 | 판정 → RESULT |
| RESULT | 결과 확인, 다음 문제, 처음부터 | 다음 → READY / 재시작 → START |

한 라운드의 `result`가 이미 있으면 추가 입력을 무시합니다. 성공 횟수는 결과가 성공일 때만 1 증가하며, 다음 라운드에서 유지됩니다. 별 표시 칸은 기본 5칸이지만 `SuccessStars slots`로 바꿀 수 있고, 숫자 `successCount`는 5를 넘어도 계속 저장됩니다.
