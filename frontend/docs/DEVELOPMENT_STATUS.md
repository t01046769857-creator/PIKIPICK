# 개발 진행 현황

- 문서 목적: 코드 존재, 구현, 실제 검증을 구분해 현재 상태를 보여 줍니다.
- 관련 기능: 전체 프론트엔드
- 현재 상태: 2026-11-12 코드 기준
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src`](../src)
- 관련 문서: [기능 목록](features/README.md) · [Before/After 규칙](before-after/README.md)

| 기능명 | 현재 상태 | 주요 구현 내용 | 코드 위치 | 검증 | 상세 문서 |
|---|---|---|---|---|---|
| 피키 인트로 | 개발 중 | PEEK→NOTICE→HOLD→APPROACH→SETTLE→REACH→TALK→IDLE, 손 시작 | `components/PikiIntroScene.tsx`, `styles.css` | 브라우저 재확인 필요 | [FEATURE-001](features/FEATURE-001_피키_손_터치_놀이_시작.md) |
| 게임 규칙 | 구현됨·미검증 | WIN/LOSE/DRAW 판정과 입력값 검사 | `game/rules.ts` | 테스트 파일 존재, 현 환경 실행 불가 | [FEATURE-002](features/FEATURE-002_가위바위보_규칙과_상태.md) |
| 게임 상태/자동 진행 | 구현됨·미검증 | 중복 입력 차단, 성공/실패 뒤 자동 진행 | `game/reducer.ts`, `App.tsx` | 테스트 파일 존재, 현 환경 실행 불가 | [FEATURE-002](features/FEATURE-002_가위바위보_규칙과_상태.md) |
| 별/파티/기록 | 구현됨·미검증 | 5개 단위 파티, localStorage 저장/초기화 | `SuccessStars.tsx`, `records.ts` | reducer 테스트 존재, 브라우저 저장 재확인 필요 | [FEATURE-003](features/FEATURE-003_별_보상과_누적_기록.md) |
| 개발 성능 계측 | 구현됨·미검증 | 평균·중앙값·p95 표본 집계, 개발자 도구 API | `metrics.ts`, `App.tsx` | 단위 테스트 파일 존재, 현 환경 실행 불가 | [FEATURE-004](features/FEATURE-004_개발용_반응_속도_계측.md) |
| 피키 에셋 맵 | 구현됨·미검증 | 표정/손동작 이미지의 중앙 경로 관리 | `assets/characters/piki/assetMap.ts` | 이미지 경로 코드 확인 | [FEATURE-005](features/FEATURE-005_피키_에셋과_표시.md) |
| 공통 브랜드 로고 | 구현됨·미검증 | 인트로와 게임 헤더가 같은 투명 PNG 사용 | `components/BrandLogo.tsx` | PNG 투명도 확인, 브라우저 미검증 | [FEATURE-006](features/FEATURE-006_공통_브랜드_로고.md) |
| 게임 화면 반응형 레이아웃 | 구현됨·미검증 | 헤더 Grid, 별 보상판 우측 열, 유연한 게임 보드 높이 | `App.tsx`, `styles.css` | 정적 검사만 수행 | [FEATURE-007](features/FEATURE-007_게임_화면_반응형_레이아웃.md) |
| MediaPipe 웹 연동 | 계획 | `AI` 입력 어댑터만 있음 | `game/input.ts` | 미구현 | [CODE_GUIDE](CODE_GUIDE.md#향후-설계) |

## 검증 상태를 읽는 법

- **구현 완료 및 검증**: 자동 테스트와 실제 화면 확인이 모두 근거로 남아 있음.
- **구현됨·미검증**: 코드와 테스트 정의는 있으나, 현재 작업 환경에서 실제 명령/브라우저 실행 근거가 없음.
- **개발 중**: 코드가 변경 중이거나 화면 결과가 확정되지 않음.
- **계획**: 설계 의도 또는 연결 지점만 있고 사용자 기능은 없음.

현재 환경에는 `node` 실행 파일이 확인되지 않아 `npm run build`, `npm test`, Vite 브라우저 확인을 이번 문서화 작업에서는 수행하지 못했습니다.
