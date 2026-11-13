import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModeCardHands, modeCardExamples } from './ModeCardHands';
import { compareGestures, isSuccessful, GAME_MODES, GESTURES } from '../game/rules';
import { pikiHands } from '../assets/characters/piki/assetMap';

describe('game selection hand examples', () => {
  it.each(GAME_MODES)('shows an accurate %s example with Piki on the left and the child on the right', mode => {
    const example = modeCardExamples[mode];
    expect(isSuccessful(mode, example.child, example.piki)).toBe(true);
    const actualWinner = compareGestures(example.child, example.piki);
    expect(example.winner).toBe(actualWinner === 1 ? 'child' : actualWinner === -1 ? 'piki' : null);
    const html = renderToStaticMarkup(<ModeCardHands mode={mode}/>);
    expect(html.indexOf('data-role="piki"')).toBeLessThan(html.indexOf('data-role="child"'));
    expect(html).toContain(`src="${pikiHands[example.piki]}"`);
    expect(html).toContain(`src="${pikiHands[example.child]}"`);
    expect((html.match(/is-winner/g) ?? []).length).toBe(mode === 'DRAW' ? 0 : 1);
  });

  it('shows all three official parts without a winning side in practice', () => {
    const html = renderToStaticMarkup(<ModeCardHands/>);
    for (const gesture of GESTURES) expect(html).toContain(`src="${pikiHands[gesture]}"`);
    expect(html).not.toContain('is-winner');
    expect(html).not.toContain('data-role');
  });
});
