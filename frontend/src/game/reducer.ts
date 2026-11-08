import { judgeRound, nextOpponent } from './rules';
import type { GameInput, GameMode, Gesture, Phase, RoundResult } from './types';

export interface GameState { phase: Phase; mode: GameMode | null; opponent: Gesture | null; result: RoundResult | null; successCount: number; roundId: number; }
export const initialState: GameState = { phase: 'START', mode: null, opponent: null, result: null, successCount: 0, roundId: 0 };
type Action =
  | { type: 'BEGIN' } | { type: 'SELECT_MODE'; mode: GameMode } | { type: 'TO_INSTRUCTION' }
  | { type: 'TO_READY' } | { type: 'START_ROUND' } | { type: 'SUBMIT_INPUT'; input: GameInput }
  | { type: 'NEXT_ROUND' } | { type: 'RESTART' };

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'BEGIN': return { ...state, phase: 'MODE_SELECT' };
    case 'SELECT_MODE': return { ...state, mode: action.mode, phase: 'INSTRUCTION', result: null };
    case 'TO_INSTRUCTION': return { ...state, phase: 'INSTRUCTION' };
    case 'TO_READY': return { ...state, phase: 'READY' };
    case 'START_ROUND': return { ...state, phase: 'PLAYING', opponent: nextOpponent(), result: null, roundId: state.roundId + 1 };
    case 'SUBMIT_INPUT': {
      if (state.phase !== 'PLAYING' || state.result || !state.mode || !state.opponent) return state;
      const result = judgeRound(state.mode, action.input.gesture, state.opponent);
      return { ...state, phase: 'RESULT', result, successCount: state.successCount + (result.success ? 1 : 0) };
    }
    case 'NEXT_ROUND': return state.phase === 'RESULT' ? { ...state, phase: 'READY', result: null } : state;
    case 'RESTART': return initialState;
  }
}
