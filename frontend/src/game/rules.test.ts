import { describe, expect, it } from 'vitest';
import { compareGestures, isSuccessful, judgeRound } from './rules';
import type { GameMode, Gesture } from './types';

const hands: Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
const modes: GameMode[] = ['WIN', 'LOSE', 'DRAW'];
const expected: Record<GameMode, Record<Gesture, Record<Gesture, boolean>>> = {
  WIN: {
    ROCK: { ROCK: false, SCISSORS: true, PAPER: false },
    SCISSORS: { ROCK: false, SCISSORS: false, PAPER: true },
    PAPER: { ROCK: true, SCISSORS: false, PAPER: false },
  },
  LOSE: {
    ROCK: { ROCK: false, SCISSORS: false, PAPER: true },
    SCISSORS: { ROCK: true, SCISSORS: false, PAPER: false },
    PAPER: { ROCK: false, SCISSORS: true, PAPER: false },
  },
  DRAW: {
    ROCK: { ROCK: true, SCISSORS: false, PAPER: false },
    SCISSORS: { ROCK: false, SCISSORS: true, PAPER: false },
    PAPER: { ROCK: false, SCISSORS: false, PAPER: true },
  },
};

describe('rock-paper-scissors rules', () => {
  it('matches all 27 mode × opponent × player combinations', () => {
    let checked = 0;
    for (const mode of modes) for (const opponent of hands) for (const player of hands) {
      const result = judgeRound(mode, player, opponent);
      expect(result.success).toBe(expected[mode][player][opponent]);
      expect(isSuccessful(mode, player, opponent)).toBe(expected[mode][player][opponent]);
      checked += 1;
    }
    expect(checked).toBe(27);
  });

  it('keeps basic win/draw/loss ordering correct', () => {
    expect(hands.flatMap(player => hands.map(opponent => compareGestures(player, opponent)))).toEqual([0, 1, -1, -1, 0, 1, 1, -1, 0]);
  });

  it('rejects invalid runtime values instead of silently treating them as a loss', () => {
    expect(() => compareGestures('LIZARD' as Gesture, 'ROCK')).toThrow(RangeError);
    expect(() => isSuccessful('UNKNOWN' as GameMode, 'ROCK', 'PAPER')).toThrow(RangeError);
  });
});
