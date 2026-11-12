import { describe, expect, it, vi } from 'vitest';
import { gameReducer, initialState, type GameState } from './reducer';

function playingState(mode: 'WIN' | 'LOSE' | 'DRAW', opponent: 'ROCK' | 'SCISSORS' | 'PAPER'): GameState {
  return { ...initialState, phase: 'PLAYING', mode, opponent, roundId: 1 };
}

describe('game state', () => {
  it.each(['START', 'MODE_SELECT', 'RULE_PRACTICE', 'RECORDS'] as const)('navigates to %s and restores the round without rolling back rewards', phase => {
    const playing = { ...playingState('WIN', 'SCISSORS'), successCount: 4, partyCount: 0 };
    const destination = gameReducer(playing, { type: 'NAVIGATE', phase });
    expect(destination.phase).toBe(phase);
    expect(destination.mode).toBeNull();
    expect(destination.opponent).toBeNull();
    expect(destination.successCount).toBe(4);
    expect(gameReducer(destination, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } })).toBe(destination);
    const cleared = gameReducer(destination, { type: 'CLEAR_RECORDS' });
    const restored = gameReducer(cleared, { type: 'RESTORE_SCREEN', screen: {
      phase: playing.phase, mode: playing.mode, opponent: playing.opponent, result: playing.result,
    } });
    expect(restored.phase).toBe('PLAYING');
    expect(restored.mode).toBe('WIN');
    expect(restored.opponent).toBe('SCISSORS');
    expect(restored.roundId).toBe(playing.roundId);
    expect(restored.successCount).toBe(0);
    expect(restored.partyCount).toBe(0);
    const result = gameReducer(restored, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } });
    expect(result.successCount).toBe(1);
    expect(gameReducer(result, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } })).toBe(result);
  });

  it.each(['WIN', 'LOSE', 'DRAW'] as const)('starts %s directly from selection, preserving records', mode => {
    const base = { ...initialState, successCount: 8, partyCount: 1, celebrationId: 1 };
    const selection = gameReducer(base, { type: 'BEGIN' });
    const playing = gameReducer(selection, { type: 'SELECT_MODE', mode });
    expect(playing.phase).toBe('PLAYING');
    expect(playing.opponent).not.toBeNull();
    expect(playing.roundId).toBe(1);
    expect(playing.successCount).toBe(8);
    expect(playing.partyCount).toBe(1);
    expect(playing.celebrationId).toBe(1);
    expect(playing.result).toBeNull();
    expect(gameReducer(playing, { type: 'FINISH_INSTRUCTION' })).toBe(playing);
    expect(gameReducer(selection, { type: 'FINISH_INSTRUCTION' })).toBe(selection);
    const another = gameReducer(playing, { type: 'CHOOSE_ANOTHER_MODE' });
    expect(gameReducer(another, { type: 'SELECT_MODE', mode }).phase).toBe('PLAYING');
    expect(gameReducer(playing, { type: 'SELECT_MODE', mode })).toBe(playing);
  });

  it('opens practice independently and returns to selection without starting a round or changing records', () => {
    const selection: GameState = { ...initialState, phase: 'MODE_SELECT', successCount: 8, partyCount: 1, celebrationId: 1, roundId: 4 };
    const practice = gameReducer(selection, { type: 'OPEN_RULE_PRACTICE' });
    expect(practice.phase).toBe('RULE_PRACTICE');
    expect(practice.mode).toBeNull();
    expect(practice.opponent).toBeNull();
    expect(gameReducer(practice, { type: 'SUBMIT_INPUT', input: { gesture: 'ROCK', source: 'BUTTON' } })).toBe(practice);
    expect(gameReducer(practice, { type: 'CHOOSE_ANOTHER_MODE' })).toEqual(selection);
    expect(gameReducer(practice, { type: 'OPEN_RULE_PRACTICE' })).toBe(practice);
    expect(gameReducer(initialState, { type: 'OPEN_RULE_PRACTICE' })).toBe(initialState);
  });

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
