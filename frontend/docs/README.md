# PIKIPICK 개발 문서

- 문서 목적: PIKIPICK의 현재 구현, 중요한 기능, 개발 상태를 코드 근거와 함께 설명합니다.
- 관련 기능: 전체 프론트엔드와 Python MediaPipe 보조 프로젝트
- 현재 상태: 문서화 체계 구축 완료, 인트로 화면은 계속 수정 중
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src`](../src), [`../../mediapipe_hand`](../../mediapipe_hand)
- 관련 문서: [프로젝트 개요](PROJECT_OVERVIEW.md) · [개발 현황](DEVELOPMENT_STATUS.md) · [코드 가이드](CODE_GUIDE.md)

## 읽는 순서

1. 처음에는 [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)와 [USER_FLOW.md](USER_FLOW.md)를 읽습니다.
2. 코드 구조가 궁금하면 [ARCHITECTURE.md](ARCHITECTURE.md), 학습용 설명은 [CODE_GUIDE.md](CODE_GUIDE.md)를 봅니다.
3. 특정 기능은 [features/](features/README.md)에서 찾습니다.
4. 완료 여부와 검증 여부는 [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md)에서 확인합니다.
5. 화면의 최초/최종 비교 규칙은 [before-after/README.md](before-after/README.md)를 따릅니다.

## 기록 규칙

- Git은 모든 파일 변경의 근거입니다. Markdown은 사람이 이해할 수 있는 이유와 현재 동작을 설명합니다.
- 중요한 기능은 구현되거나 구조가 크게 바뀐 시점에 `features/` 문서를 추가하거나 갱신합니다.
- 작은 색상·간격 수정은 상세 기능 문서를 새로 만들지 않습니다.
- Before/After에는 최초 기준과 **검증된 최종**만 기록합니다. 인트로처럼 수정 중인 화면은 최종으로 표시하지 않습니다.
- 문서의 상태는 코드 존재와 실제 검증을 구분합니다. 테스트를 실행하지 못했다면 `구현됨·미검증`으로 기록합니다.

## 기존 자료

- [GAME_RULES.md](GAME_RULES.md): 초기 규칙/상태 설명. 현재 구현은 FEATURE-002를 함께 확인합니다.
- [PIKI_CHARACTER_GUIDE.md](PIKI_CHARACTER_GUIDE.md): 피키 외형 기준.
- [PIKI_RIGGING_ANALYSIS.md](PIKI_RIGGING_ANALYSIS.md): 실패한 전체 리깅 실험과 재시도 조건.
- [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md): 초기 개발 기록. 이 문서 체계가 이후의 상태 관리를 보완합니다.
