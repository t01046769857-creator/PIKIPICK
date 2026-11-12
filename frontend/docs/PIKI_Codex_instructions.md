# PIKIPICK — PIKI 캐릭터 제작 및 프론트엔드 적용 작업지시

- 문서 목적: 피키 에셋 제작 시 지켜야 할 원래 작업 지시를 보존합니다.
- 관련 기능: 캐릭터 이미지 제작과 적용
- 현재 상태: 참고 지시서
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`../src/assets/characters/piki`](../src/assets/characters/piki)
- 관련 문서: [피키 캐릭터 가이드](PIKI_CHARACTER_GUIDE.md) · [에셋 기능 기록](features/FEATURE-005_피키_에셋과_표시.md)

## 최우선 원칙
`PIKI_MASTER_A.png`가 캐릭터 외형의 유일한 기준이다. 캐릭터를 다른 강아지/고양이/젤리로 바꾸지 않는다. 첨부된 시트는 표현 참고일 뿐, 다른 캐릭터 외형을 섞지 않는다. 캐릭터 리소스는 프로젝트의 핵심 기능이다.

## 반드시 먼저 할 일
1. PIKIPICK 루트 및 frontend 구조를 살핀다. `frontend/src/assets/characters/piki/`를 사용한다.
2. 이 ZIP의 `PIKI_MASTER_A.png`를 마스터 참고용으로 저장하고 화면에서 원본 시트를 통째로 표시하지 않는다.
3. Codex가 실제 이미지 생성/편집 도구를 사용할 수 있는지 확인한다. 사용 가능하면 마스터 이미지를 이미지 참조로 지정해 포즈별 독립 투명 PNG를 제작한다. 사용 불가능하면 제작 완료라고 말하지 않고 필요한 도구/입력과 별도로 만들어야 하는 리소스를 명확히 보고한다. 기존 한 장에서 복원할 수 없는 시점/표정을 단순 크롭으로 만든 것처럼 주장하지 않는다.

## 외형 고정 규격
- 하얀 커다란 말랑한 머리, 양옆으로 내려온 부드러운 귀 같은 부분, 매우 작은 둥근 몸통과 짧은 팔다리
- 머리 위 분홍색 말랑한 구름 모양 돌기 하나
- 두꺼운 짙은 외곽선, 양 볼 핑크색 홍조, 표정이 크고 과장되며 깨발랄함
- 목 앞 민트색 삼각 장식과 노란 별 하나; 위치/형태/색상 일관성 유지
- 복장, 머리 돌기 개수, 귀 길이, 색상 임의 변경 금지
- 메인 캐릭터 1명만, 라벨/문자/말풍선/배경/그림자 없이 투명 배경
- 각 PNG 같은 정사각 캔버스(가령 1024x1024), 피키 크기·여백 일관성 유지

## 제작할 개별 리소스
expressions/piki-idle.png : 반가운 미소, 손 흔들기 (첫 화면)
expressions/piki-happy.png : 매우 신나는 성공 환호
expressions/piki-curious.png : 고개 갸웃, 궁금한 눈
expressions/piki-surprised.png : 놀란 표정, 동그란 눈
expressions/piki-playful.png : 윙크, 장난기 있는 웃음
expressions/piki-encourage.png : 실패를 탓하지 않는 응원, 다시 도전

gestures/piki-rock.png : 주먹(바위)을 명확히 표현
gestures/piki-scissors.png : 손가락 둘(가위)을 명확히 표현
gestures/piki-paper.png : 손가락 펼친 손(보)을 명확히 표현

일관성이 중요한 만큼 초기 출력은 한 번에 전체 제작보다 마스터 1종 + 대표 표정 2~3종을 먼저 비교 검수한다. 이후 9종 전체 완성.

## React 연결
- `frontend/src/assets/characters/piki`에서 파일 관리. PNG 실제 존재 후 import/매핑하도록 한다. 이미지가 없으면 없는 상태를 정확히 알린다.
- `PikiCharacter` 컴포넌트 및 타입 안전한 emotion/gesture 이미지 맵 사용. TS 객체 또는 JSON 설정 가능. JSON만으로 자동 이미지 학습되지는 않는다.
- 시작/선택/규칙/준비/게임/결과 화면 각각 상태에 맞는 피키를 표시.
- CSS 짧은 바운스/흔들기 애니메이션, prefers-reduced-motion 지원. 정확도 테스트 중인 MediaPipe는 별도 유지.
- `successCount`는 화면 이동에 의해 초기화되지 않으며 명시적 초기화만 허용. 기존 규칙·reducer·테스트 보존.
- Python MediaPipe/CSV/.joblib, Git 설정 임의 수정 금지. commit/push 금지.

## 완료 기준 및 보고
- 실제 생성한 각 PNG 파일 경로/크기/투명 여부
- 마스터와 스타일 일관성 확인 결과 및 손동작 인식 용이성
- 제작 불가능한 항목과 실제 만든 항목 구분
- React 컴포넌트 및 화면 매핑 결과, 테스트·빌드 결과
- 디자인 자체가 AI 모델의 가중치에 '학습'된 것인지, 참조 이미지 기반 생성인지 구분하여 보고
