import { describe, expect, it, vi } from 'vitest';
import { gameReducer, initialState } from './reducer';

describe('game state', () => {
  it('increments success once and ignores duplicate input', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // opponent ROCK
    let state = gameReducer(initialState, { type: 'BEGIN' });
    state = gameReducer(state, { type: 'SELECT_MODE', mode: 'DRAW' });
    state = gameReducer(state, { type: 'TO_READY' });
    state = gameReducer(state, { type: 'START_ROUND' });
    state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
    expect(state.successCount).toBe(1);
    state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
    expect(state.successCount).toBe(1);
    vi.restoreAllMocks();
  });
  it('keeps count for retry and next round, but restart clears it', () => {
    const resultState = { ...initialState, phase: 'RESULT' as const, successCount: 3 };
    expect(gameReducer(resultState, { type: 'NEXT_ROUND' }).successCount).toBe(3);
    expect(gameReducer(resultState, { type: 'RESTART' })).toEqual(initialState);
  });
});
