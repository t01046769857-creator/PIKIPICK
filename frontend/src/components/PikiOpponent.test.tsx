import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PikiOpponent } from './PikiOpponent';
import { pikiGestures, pikiExpressions, pikiHands } from '../assets/characters/piki/assetMap';
import { GESTURES, gestureLabel } from '../game/rules';

describe('shared opponent presentation', () => {
  it.each(GESTURES)('keeps the %s character and highlighted move in sync', gesture => {
    const html = renderToStaticMarkup(<PikiOpponent gesture={gesture} celebrating={false}/>);
    expect(html).toContain(`src="${pikiGestures[gesture]}"`);
    expect(html).toContain(`alt="피키가 낸 ${gestureLabel[gesture]}"`);
    expect(html).toContain(`src="${pikiHands[gesture]}"`);
    expect(html).not.toContain('piki-party-dance');
  });

  it.each(['success', 'retry'] as const)('preserves the %s expression and last opponent move in result feedback', result => {
    const html = renderToStaticMarkup(<PikiOpponent gesture="SCISSORS" result={result} celebrating={result === 'success'}/>);
    expect(html).toContain(`src="${pikiExpressions[result === 'success' ? 'successHappy' : 'encourage']}"`);
    expect(html).toContain('alt="피키가 낸 가위"');
    expect(html).toContain(`src="${pikiHands.SCISSORS}"`);
    if (result === 'success') expect(html).toContain('piki-party-dance');
  });
});
