# 기술·디자인 결정 기록

- 문서 목적: 중요한 선택의 이유와 현재 결론을 남깁니다.
- 관련 기능: 피키 렌더링, 게임 구조, 기록 관리
- 현재 상태: 초기 결정 정리됨
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src`](../../src)
- 관련 문서: [리깅 분석](../PIKI_RIGGING_ANALYSIS.md) · [기능 문서](../features/README.md)

## 확인 가능한 결정

| 결정 | 근거 | 현재 결론 |
|---|---|---|
| 게임 규칙을 React에서 분리 | `game/rules.ts`, `rules.test.ts` | UI 없이 27개 조합을 테스트할 수 있는 순수 함수로 유지 |
| 누적 기록을 게임 진행과 분리 | `CumulativeRecords`, `records.ts` | 화면/문제 전환 중 성공 수를 유지하고, 명시적 초기화만 기록을 지움 |
| 입력 형식 통일 | `GameInput`, `inputFromButton`, `inputFromAI` | 버튼과 미래 AI 입력이 같은 reducer 진입점을 사용 |
| 피키 전체 리깅 중단 | `PIKI_RIGGING_ANALYSIS.md` | 검증되지 않은 독립 파츠 리깅을 라이브 화면에서 사용하지 않음 |

## 새 결정 기록 양식

중요한 구조 변경이 생기면 `DECISION-XXX_이름.md`를 추가하고, 문제·대안·선택·검증 상태·관련 커밋을 기록합니다.
