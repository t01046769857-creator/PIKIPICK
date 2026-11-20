# FEATURE-049 — 비밀나라 자유 이동·위치 유지·재입장

## 변경 목적

비밀나라에서 목적지 단위 이동만 가능하고, 화면을 나갔다 다시 들어오면 마지막 위치가 사라지던 문제를 수정했다.

## 구현 내용

- `LxpSecretLandDashboard.tsx`의 활성 `LivingPath`에 월드 경로의 최근접 진행값 계산을 추가했다.
- 지도 클릭·터치 시 목적지 앵커가 아니라 실제 곡선 경로의 가장 가까운 지점까지 이동한다.
- 지도에 포커스한 상태에서 `ArrowLeft`/`ArrowRight`를 누르는 동안 같은 경로를 연속 이동한다.
- 열린 최대 구간을 넘으면 이동을 멈추고 기존 잠금 안내를 표시한다. 왼쪽으로 돌아가는 이동은 차단하지 않는다.
- `pikipick.secret-land.position.v1`에 현재 경로 진행값을 저장한다.
- 저장된 위치가 있으면 해당 위치에서 재입장하고, 저장값이 없으면 현재 해금된 마지막 탐험지의 `pathAnchor` 진행값을 초기값으로 사용한다.
- 기존 해금 상태, 카메라 계산, 방향별 피키 에셋, 목적지 조건은 유지했다.

## 데이터 경계

위치 진행값은 현재 브라우저의 로컬 상태로만 보관한다. 기존 놀이 기록·배지·FastAPI·TiDB 데이터는 변경하지 않는다.

## 검증

- `npm.cmd test -- --run`: 12개 테스트 파일, 62개 테스트 통과
- `npm.cmd run build`: TypeScript와 Vite 빌드 통과
- `http://localhost:5173/play/world`: HTTP 200 응답 확인
- 실제 브라우저에서 키 입력을 지속 주입하는 자동화 도구는 현재 환경에 없어, 장시간 키 홀드·터치 이동의 시각 검증은 미실행이다.
## Movement stability follow-up

- Manual movement completion no longer lowers the unlocked stop.
- Automatic unlock motion and ordinary pointer movement now have separate completion behavior.
- Re-entry initialization uses the last unlocked stop rather than a stale saved mid-route position.
- The approved 2400x800 world remains unchanged; bridge Y anchors follow the measured stone deck while X spacing and unlock logic remain unchanged.
- Browser verification covered pointer movement, ArrowRight release, stationary retention, locked-boundary notice, and leave/re-enter position retention.
