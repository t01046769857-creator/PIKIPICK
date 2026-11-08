import type { GameMode, Gesture, RoundResult } from './types';

export const GESTURES: readonly Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
export const gestureLabel: Record<Gesture, string> = { ROCK: '바위', SCISSORS: '가위', PAPER: '보' };
const beats: Record<Gesture, Gesture> = { ROCK: 'SCISSORS', SCISSORS: 'PAPER', PAPER: 'ROCK' };

/** 일반적인 승패를 판정합니다. 반환값은 1(플레이어 승), 0(무), -1(플레이어 패)입니다. */
export function compareGestures(player: Gesture, opponent: Gesture): 1 | 0 | -1 {
  if (player === opponent) return 0;
  return beats[player] === opponent ? 1 : -1;
}

/** 게임 모드의 성공 조건만 담당합니다. UI나 React 상태를 알지 못합니다. */
export function isSuccessful(mode: GameMode, player: Gesture, opponent: Gesture): boolean {
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
