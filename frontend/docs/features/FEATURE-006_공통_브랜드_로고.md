# FEATURE-006 — 공통 브랜드 로고

- 문서 목적: 인트로와 게임 화면에 동일한 PIKIPICK 브랜드 로고를 표시하는 방식을 설명합니다.
- 관련 기능: 브랜드 로고, 인트로 상단, 게임 헤더
- 현재 상태: 구현됨·미검증
- 마지막 확인일: 2026-11-12
- 관련 코드 위치: [`BrandLogo.tsx`](../../src/components/BrandLogo.tsx), [`pikipick-logo.png`](../../src/assets/brand/pikipick-logo.png)
- 관련 문서: [프로젝트 개요](../PROJECT_OVERVIEW.md)

## 무엇인가요?

제공된 PIKIPICK 로고를 한 개의 투명 PNG 에셋으로 저장하고, 시작 화면과 가위바위보 화면 헤더가 같은 컴포넌트를 통해 표시하는 기능입니다. 리본 부제목은 `놀면서 배우고 · 경험하며 성장하는`이며 `LXP`는 포함하지 않습니다.

## 구현 파일

| 파일 | 역할 |
|---|---|
| `src/assets/brand/pikipick-logo.png` | 승인된 공통 로고 이미지 |
| `src/components/BrandLogo.tsx` | 화면 크기에 따른 로고 variant와 대체 텍스트 제공 |
| `src/components/PikiIntroScene.tsx` | 인트로 좌상단에 `intro` 크기 로고 표시 |
| `src/App.tsx` | 게임/선택 화면 헤더에 기본 크기 로고 표시 |
| `src/styles.css` | 인트로·일반 화면의 반응형 로고 폭 지정 |

## 핵심 코드

```tsx
export function BrandLogo({ variant = 'compact' }: BrandLogoProps) {
  return <img className={`brand-logo brand-logo--${variant}`} src={logo}
    alt="PIKIPICK — 놀면서 배우고 경험하며 성장하는" />;
}
```

이미지 경로를 각 화면에 반복하지 않고 공통 컴포넌트에 모았습니다. 새로운 화면에서 로고가 필요하면 `<BrandLogo />`를 사용하면 됩니다.

## 검증 결과

투명 PNG의 좌상단과 상단 중앙 픽셀 알파값이 0인 것을 확인해 배경이 포함되지 않았음을 점검했습니다. Node/Vite 브라우저 실행 환경이 없어 화면별 실제 표시 크기는 **미검증**입니다.
