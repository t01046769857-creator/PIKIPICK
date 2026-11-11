import { describe, expect, it, vi } from 'vitest';
import { gameReducer, initialState, type GameState } from './reducer';

function playingState(mode: 'WIN' | 'LOSE' | 'DRAW', opponent: 'ROCK' | 'SCISSORS' | 'PAPER'): GameState {
  return { ...initialState, phase: 'PLAYING', mode, opponent, roundId: 1 };
}

describe('game state', () => {
  it('increments success once and ignores duplicate or rapid follow-up input', () => {
    let state = playingState('DRAW', 'ROCK');
    state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
    expect(state.successCount).toBe(1);
    const afterResult = state;
    state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
    state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'PAPER', source: 'AI' } });
    expect(state).toBe(afterResult);
    expect(state.successCount).toBe(1);
  });

  it('retries the same failed problem without changing success count or opponent', () => {
    let state = gameReducer(playingState('WIN', 'ROCK'), { type: 'SUBMIT_INPUT', input: { gesture: 'SCISSORS', source: 'BUTTON' } });
    expect(state.result?.success).toBe(false);
    state = gameReducer(state, { type: 'RETRY_ROUND' });
    expect(state.phase).toBe('PLAYING');
    expect(state.opponent).toBe('ROCK');
    expect(state.result).toBeNull();
    expect(state.successCount).toBe(0);
  });

  it('moves to a new problem after success and clears the previous result', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    let state = gameReducer(playingState('DRAW', 'ROCK'), { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
    state = gameReducer(state, { type: 'NEXT_ROUND' });
    expect(state.phase).toBe('PLAYING');
    expect(state.roundId).toBe(2);
    expect(state.opponent).toBe('ROCK');
    expect(state.result).toBeNull();
    expect(state.successCount).toBe(1);
    vi.restoreAllMocks();
  });

  it('starts a fresh five-star set after each completed party without duplicate celebrations', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // every next opponent is ROCK
    let state = playingState('DRAW', 'ROCK');
    const checkpoints = new Map([[4, [0, 0]], [5, [1, 1]], [6, [1, 1]], [10, [2, 2]], [11, [2, 2]]]);
    for (let success = 1; success <= 11; success += 1) {
      state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
      const expected = checkpoints.get(success);
      if (expected) {
        expect(state.successCount).toBe(success);
        expect(state.partyCount).toBe(expected[0]);
        expect(state.celebrationId).toBe(expected[1]);
        expect(state.successCount % 5).toBe(success % 5);
      }
      if (success === 5) {
        const completedParty = state;
        state = gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
        expect(state).toBe(completedParty);
        expect(state.partyCount).toBe(1);
        expect(state.celebrationId).toBe(1);
      }
      if (success < 11) state = gameReducer(state, { type: 'NEXT_ROUND' });
    }
    vi.restoreAllMocks();
  });

  it('preserves cumulative stars across normal screen transitions and restart', () => {
    const readyState: GameState = { ...initialState, phase: 'READY', mode: 'WIN', successCount: 3 };
    expect(gameReducer(readyState, { type: 'TO_INSTRUCTION' }).successCount).toBe(3);
    expect(gameReducer(readyState, { type: 'START_ROUND' }).successCount).toBe(3);
    const restarted = gameReducer(readyState, { type: 'RESTART' });
    expect(restarted.phase).toBe('START');
    expect(restarted.successCount).toBe(3);
    expect(restarted.partyCount).toBe(0);
  });

  it('rejects invalid actions and invalid runtime inputs without changing state', () => {
    const state = playingState('WIN', 'ROCK');
    expect(gameReducer(state, { type: 'SELECT_MODE', mode: 'INVALID' as never })).toBe(state);
    expect(gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'LIZARD' as never, source: 'BUTTON' } })).toBe(state);
    expect(gameReducer(state, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'VOICE' as never } })).toBe(state);
  });

  it('keeps records when choosing another mode and clears records only through the dedicated action', () => {
    const state: GameState = { ...playingState('WIN', 'ROCK'), successCount: 8, partyCount: 1, celebrationId: 1 };
    const modeSelection = gameReducer(state, { type: 'CHOOSE_ANOTHER_MODE' });
    expect(modeSelection.phase).toBe('MODE_SELECT');
    expect(modeSelection.successCount).toBe(8);
    expect(modeSelection.partyCount).toBe(1);
    const cleared = gameReducer(modeSelection, { type: 'CLEAR_RECORDS' });
    expect(cleared.successCount).toBe(0);
    expect(cleared.partyCount).toBe(0);
    expect(cleared.celebrationId).toBe(0);
  });
});
