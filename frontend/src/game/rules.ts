import type { GameMode, Gesture, RoundResult } from './types';

export const GESTURES: readonly Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
export const GAME_MODES: readonly GameMode[] = ['WIN', 'LOSE', 'DRAW'];
export const gestureLabel: Record<Gesture, string> = { ROCK: '바위', SCISSORS: '가위', PAPER: '보' };

const beats: Record<Gesture, Gesture> = { ROCK: 'SCISSORS', SCISSORS: 'PAPER', PAPER: 'ROCK' };

export function isGesture(value: unknown): value is Gesture {
  return typeof value === 'string' && (GESTURES as readonly string[]).includes(value);
}

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && (GAME_MODES as readonly string[]).includes(value);
}

function assertRoundValues(mode: unknown, player: unknown, opponent: unknown): asserts mode is GameMode {
  if (!isGameMode(mode) || !isGesture(player) || !isGesture(opponent)) {
    throw new RangeError('Invalid rock-paper-scissors round value');
  }
}

/** 아이가 이기면 1, 비기면 0, 지면 -1을 반환한다. */
export function compareGestures(player: Gesture, opponent: Gesture): 1 | 0 | -1 {
  if (!isGesture(player) || !isGesture(opponent)) throw new RangeError('Invalid gesture');
  if (player === opponent) return 0;
  return beats[player] === opponent ? 1 : -1;
}

/**
 * ★ 가위바위보 성공 판정
 * 화면·타이머·입력 장치와 독립되어 있어 버튼과 미래 AI 입력이 같은 규칙을 사용한다.
 * 관련 문서: docs/features/FEATURE-002_가위바위보_규칙과_상태.md
 */
export function isSuccessful(mode: GameMode, player: Gesture, opponent: Gesture): boolean {
  assertRoundValues(mode, player, opponent);
  const comparison = compareGestures(player, opponent);
  if (mode === 'WIN') return comparison === 1;
  if (mode === 'LOSE') return comparison === -1;
  return comparison === 0;
}

export function judgeRound(mode: GameMode, player: Gesture, opponent: Gesture): RoundResult {
  return { mode, player, opponent, success: isSuccessful(mode, player, opponent) };
}

export function nextOpponent(): Gesture {
  return GESTURES[Math.floor(Math.random() * GESTURES.length)];
}
