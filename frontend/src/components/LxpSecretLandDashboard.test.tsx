import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { badgeAssetByConceptId, badgeAssetById, badgeConceptAssets } from '../assets/badges/badgeAssets';
import { LxpBadgeCollection, LxpSecretLandDashboard } from './LxpSecretLandDashboard';

describe('LxpBadgeCollection', () => {
  it('배지 도감을 6개 단위 페이지와 이전·다음 버튼으로 표시한다', () => {
    const html = renderToStaticMarkup(<LxpBadgeCollection successCount={5} onSelect={() => undefined} onPlay={() => undefined} />);
    expect(html).toContain('배지 도감 페이지 이동');
    expect(html).toContain('〈 이전');
    expect(html).toContain('다음 〉');
    expect(html).toContain('수정 궁전');
    expect(html).toContain('piki-character--curious');
    expect(html).toContain('lxp-secret__collection--badge-page');
    expect(html).toContain('lxp-secret__collection-header');
    expect(html).not.toContain('새 놀이 만나기');
    expect(html).toContain('lxp-secret__badge-card is-earned');
  });
});

describe('LxpSecretLandDashboard world layers', () => {
  it('renders the shared adventure world as layered terrain and bridge art', () => {
    const html = renderToStaticMarkup(<LxpSecretLandDashboard successCount={5} partyCount={1} roundCount={5} onBadges={() => undefined} onPlay={() => undefined} />);

    expect(html).toContain('피키의 비밀길 목적지');
    // Environment PNGs own the active landmark art; only uncovered/locked
    // landmarks retain the legacy SVG/image layer.
    expect((html.match(/lxp-secret__terrain-landmark/g) ?? [])).toHaveLength(2);
    expect(html).toContain('lxp-secret__world-background');
    expect(html).toContain('lxp-secret__world-bridge');
    expect(html).toContain('lxp-secret__world-transition-forest');
    expect(html).toContain('lxp-secret__terrain-path');
    expect(html).not.toContain('lxp-secret__approved-world-segment');
    expect(html).toContain('두근두근 신나는 탐험!');
    expect(html).toContain('피키와 함께 떠나는 모험 대장전');
    expect(html).toContain('정면으로 서 있는 피키');
    expect(html).toContain('<section class="lxp-secret__treasure-display" aria-label="내가 발견한 보물">');
    expect(html).not.toContain('lxp-secret__treasure-display" onClick');
    expect(html).toContain('lxp-secret__badge-book');
    expect(html).toContain('lxp-secret__treasure-case is-closed');
    expect(html).not.toContain('lxp-secret__treasure-chest-front-mask');
    expect(html).not.toContain('lxp-secret__path-shadow');
  });

  it('exposes the active world as the shared mouse and keyboard movement surface', () => {
    const html = renderToStaticMarkup(<LxpSecretLandDashboard successCount={5} partyCount={1} roundCount={5} onBadges={() => undefined} onPlay={() => undefined} />);

    expect(html).toContain('tabindex="0"');
    expect(html).toContain('열린 길을 클릭하거나 방향키를 눌러 자유롭게 이동할 수 있어요');
  });
});

describe('badge concept assets', () => {
  it('keeps all 40 source PNGs available and maps only verified ID matches', () => {
    expect(badgeConceptAssets).toHaveLength(40);
    expect(Object.values(badgeAssetById)).toHaveLength(4);
    expect(Object.keys(badgeAssetByConceptId)).toHaveLength(36);
    expect(badgeAssetById.FIVE_SUCCESSES).toBeTruthy();
    expect(badgeAssetByConceptId['crystal-palace']).toContain('collection/badge-art-01');
    expect(badgeAssetByConceptId['dragon-egg']).toContain('badge_concept_02-clean');
    expect(badgeAssetByConceptId['rainbow-butterfly']).toContain('badge_concept_03-clean');
    expect(badgeAssetByConceptId['treasure-chest']).toContain('collection/badge-art-04');
    expect(badgeAssetByConceptId['future-10']).toContain('collection/badge-art-39');
    expect(badgeAssetByConceptId['starlight-key']).toBeTruthy();
    expect(badgeAssetById.NEW_ACTIVITY).toBeUndefined();
  });
});
