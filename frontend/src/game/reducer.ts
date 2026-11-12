import { isGameMode, isGesture, judgeRound, nextOpponent } from './rules';
import type { AdvanceTiming, GameInput, GameMode, Gesture, InputSource, InputTiming, Phase, RoundResult } from './types';

export interface CurrentPlayState {
  phase: Phase;
  mode: GameMode | null;
}

export interface CurrentRoundState {
  opponent: Gesture | null;
  result: RoundResult | null;
  roundId: number;
}

export interface CumulativeRecords {
  successCount: number;
  partyCount: number;
  celebrationId: number;
}

export interface GameState extends CurrentPlayState, CurrentRoundState, CumulativeRecords {
  inputSequence: number;
  advanceSequence: number;
  lastInputTiming: InputTiming | null;
  lastAdvanceTiming: AdvanceTiming | null;
}

export const initialState: GameState = {
  phase: 'START', mode: null, opponent: null, result: null, successCount: 0, partyCount: 0, celebrationId: 0, roundId: 0,
  inputSequence: 0, advanceSequence: 0, lastInputTiming: null, lastAdvanceTiming: null,
};

export type GameAction =
  | { type: 'BEGIN' }
  | { type: 'SELECT_MODE'; mode: GameMode }
  | { type: 'TO_INSTRUCTION' }
  | { type: 'TO_READY' }
  | { type: 'START_ROUND' }
  | { type: 'SUBMIT_INPUT'; input: GameInput; requestedAt?: number }
  | { type: 'NEXT_ROUND'; requestedAt?: number }
  | { type: 'RETRY_ROUND'; requestedAt?: number }
  | { type: 'CHOOSE_ANOTHER_MODE' }
  | { type: 'CLEAR_RECORDS' }
  | { type: 'RESTART' };

const isInputSource = (value: unknown): value is InputSource => value === 'BUTTON' || value === 'AI';

function advanceTiming(state: GameState, requestedAt: number | undefined, kind: AdvanceTiming['kind']): Pick<GameState, 'advanceSequence' | 'lastAdvanceTiming'> {
  const id = state.advanceSequence + 1;
  return { advanceSequence: id, lastAdvanceTiming: typeof requestedAt === 'number' ? { id, startedAt: requestedAt, kind } : null };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BEGIN':
      return state.phase === 'START' ? { ...state, phase: 'MODE_SELECT' } : state;
    case 'SELECT_MODE':
      return state.phase === 'MODE_SELECT' && isGameMode(action.mode)
        ? { ...state, mode: action.mode, phase: 'INSTRUCTION', result: null } : state;
    case 'TO_INSTRUCTION':
      return state.mode && state.phase === 'READY' ? { ...state, phase: 'INSTRUCTION' } : state;
    case 'TO_READY':
      return state.mode && state.phase === 'INSTRUCTION' ? { ...state, phase: 'READY' } : state;
    case 'START_ROUND':
      return state.mode && state.phase === 'READY'
        ? { ...state, phase: 'PLAYING', opponent: nextOpponent(), result: null, roundId: state.roundId + 1, lastInputTiming: null } : state;
    case 'SUBMIT_INPUT': {
      // ★ 결과가 이미 있거나 PLAYING 단계가 아니면 같은 입력을 무시해 성공 기록 중복을 막는다.
      if (state.phase !== 'PLAYING' || state.result || !state.mode || !isGesture(state.opponent) || !isGesture(action.input.gesture) || !isInputSource(action.input.source)) return state;
      const result = judgeRound(state.mode, action.input.gesture, state.opponent);
      const id = state.inputSequence + 1;
      const lastInputTiming = typeof action.requestedAt === 'number'
        ? { id, startedAt: action.requestedAt, decidedAt: performance.now() } : null;
      const successCount = state.successCount + (result.success ? 1 : 0);
      const partyCompleted = result.success && successCount % 5 === 0;
      return {
        ...state,
        phase: 'RESULT',
        result,
        successCount,
        partyCount: state.partyCount + (partyCompleted ? 1 : 0),
        celebrationId: state.celebrationId + (partyCompleted ? 1 : 0),
        inputSequence: id,
        lastInputTiming,
      };
    }
    case 'RETRY_ROUND':
      return state.phase === 'RESULT' && state.result && !state.result.success && state.mode && isGesture(state.opponent)
        ? { ...state, phase: 'PLAYING', result: null, lastInputTiming: null, ...advanceTiming(state, action.requestedAt, 'RETRY') } : state;
    case 'NEXT_ROUND':
      return state.phase === 'RESULT' && state.result?.success && state.mode
        ? { ...state, phase: 'PLAYING', opponent: nextOpponent(), result: null, roundId: state.roundId + 1, lastInputTiming: null, ...advanceTiming(state, action.requestedAt, 'NEXT') } : state;
    case 'CHOOSE_ANOTHER_MODE':
      return state.phase !== 'START' ? { ...state, phase: 'MODE_SELECT', mode: null, opponent: null, result: null, lastInputTiming: null } : state;
    case 'CLEAR_RECORDS':
      // 기록 초기화는 이 전용 액션에서만 수행한다. 화면/모드 이동은 누적 기록을 지우지 않는다.
      return { ...state, successCount: 0, partyCount: 0, celebrationId: 0 };
    case 'RESTART':
      // 놀이 흐름만 처음으로 돌리고 아이의 누적 기록은 보존한다.
      return { ...initialState, successCount: state.successCount, partyCount: state.partyCount, celebrationId: state.celebrationId };
  }
}
