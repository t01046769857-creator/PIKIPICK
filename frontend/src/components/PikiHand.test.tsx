import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { pikiHands } from '../assets/characters/piki/assetMap';
import { GAME_MODES, GESTURES, gestureLabel } from '../game/rules';
import { gameReducer, initialState } from '../game/reducer';
import { PikiHand } from './PikiHand';
import { PikiOpponent } from './PikiOpponent';
import { GameRulePractice } from './GameRulePractice';

describe('official hand assets', () => {
  it.each(GESTURES)('renders %s as an uncropped registered PNG', gesture => {
    const html = renderToStaticMarkup(<PikiHand gesture={gesture}/>);
    expect(html).toContain(`src="${pikiHands[gesture]}"`);
    expect(html).toContain(`alt="${gestureLabel[gesture]} 손동작"`);
    expect(html).toContain('width="1024" height="1024"');
    expect(html).not.toMatch(/<svg|clipPath|<mask/);
  });

  it.each(GAME_MODES)('shows the actual opponent PNG during %s play and result', mode => {
    for (const opponent of GESTURES) {
      const playing = { ...initialState, phase: 'PLAYING' as const, mode, opponent };
      for (const player of GESTURES) {
        const result = gameReducer(playing, { type: 'SUBMIT_INPUT', input: { gesture: player, source: 'BUTTON' } });
        const html = renderToStaticMarkup(<PikiOpponent gesture={result.opponent}
          result={result.result?.success ? 'success' : 'retry'} celebrating={false}/>);
        expect(html).toContain(`src="${pikiHands[opponent]}"`);
        expect(html).toContain(`alt="피키가 낸 ${gestureLabel[opponent]}"`);
      }
    }
  });

  it('uses official parts for the practice guide and all three answers', () => {
    const html = renderToStaticMarkup(<GameRulePractice onComplete={() => undefined}/>);
    for (const gesture of GESTURES) expect(html).toContain(`src="${pikiHands[gesture]}"`);
    expect(html).toContain('alt="피키가 낸 바위"');
    expect(html).not.toMatch(/✊|✌|✋|clipPath|<mask/);
  });
});
