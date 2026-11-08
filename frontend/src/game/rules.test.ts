import { describe, expect, it } from 'vitest';
import { compareGestures, isSuccessful } from './rules';
import type { Gesture } from './types';

const hands: Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
describe('rock-paper-scissors rules', () => {
  it('handles all nine basic combinations', () => {
    expect(hands.flatMap(player => hands.map(opponent => compareGestures(player, opponent)))).toEqual([0, 1, -1, -1, 0, 1, 1, -1, 0]);
  });
  it('supports win, lose, and draw modes', () => {
    expect(isSuccessful('WIN', 'ROCK', 'SCISSORS')).toBe(true);
    expect(isSuccessful('LOSE', 'ROCK', 'PAPER')).toBe(true);
    expect(isSuccessful('DRAW', 'PAPER', 'PAPER')).toBe(true);
    expect(isSuccessful('WIN', 'ROCK', 'PAPER')).toBe(false);
  });
});
