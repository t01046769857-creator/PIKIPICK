# FEATURE-051 게임 내 메뉴 아이콘 6종

## 변경 목적

게임 헤더의 기존 2열×3행 팝업 메뉴에서 SVG·CSS 아이콘만 PNG 에셋으로 교체한다. 메뉴 순서, 제목, 클릭 핸들러, 소리 상태 동작은 유지한다.

## 적용 위치

- 에셋: `frontend/src/assets/menu-icons/`
- 렌더링: `frontend/src/components/StoryNavigation.tsx`
- 표시 스타일: `frontend/src/components/StoryNavigation.css`

## 매핑

| 메뉴 위치 | 제목 | 파일 |
| --- | --- | --- |
| 왼쪽 위 | 처음으로 | `menu-home-clean.png` |
| 오른쪽 위 | 놀이 선택 | `menu-play-select-clean.png` |
| 왼쪽 가운데 | 규칙 연습 | `menu-rule-practice.png` |
| 오른쪽 가운데 | 피키픽 비밀나라 | `menu-secret-land.png` |
| 왼쪽 아래 | 소리 켜짐 | `menu-sound-on-clean.png` |
| 오른쪽 아래 | 상상표현놀이 | `menu-imagination.png` |

ZIP 원본 중 `menu-home.png`, `menu-play-select.png`, `menu-sound-on.png`에는 인접 그림의 가장자리 픽셀이 포함되어 있어 원본을 보존한 채 `*-clean.png`를 별도로 만들었다. 나머지 메뉴 원본은 수정하지 않았다. 모든 런타임 이미지는 512×512 RGBA 투명 이미지다. 소리 끔 상태에는 ZIP에 대체 에셋이 없으므로 기존 SVG 음소거 표현을 유지한다.

## 검증

기존 메뉴의 6개 DOM 순서와 제목을 유지하고, 이미지 `object-fit: contain`을 적용했다. 클릭·키보드 접근성은 기존 `button`과 핸들러를 그대로 사용한다.

