import type { Gesture } from '../types';
import type { LearningLevelConfig } from './types';

export type MukPhase = 'RPS' | 'ATTACK' | 'MATCH' | 'DUEL';
export interface MukProblem {
  id: string;
  level: number;
  ruleId: string;
  phase: MukPhase;
  opponent: Gesture;
  attacker: 'CHILD' | 'PIKI';
}

export const mukLevels: readonly LearningLevelConfig[] = [
  { id: 1, title: '이기는 손 찾기', ruleId: 'muk-rps', warmup: true },
  { id: 2, title: '공격권 알아보기', ruleId: 'muk-attack' },
  { id: 3, title: '같은 손이면 승리', ruleId: 'muk-match' },
  { id: 4, title: '묵찌빠 대결', ruleId: 'muk-duel' },
];

const gestures: readonly Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
const beats: Record<Gesture, Gesture> = { ROCK: 'SCISSORS', SCISSORS: 'PAPER', PAPER: 'ROCK' };

export function createMukProblem(level: number, index: number): MukProblem {
  const opponent = gestures[index % gestures.length];
  const phase: MukPhase = level === 1 ? 'RPS' : level === 2 ? 'ATTACK' : level === 3 ? 'MATCH' : 'DUEL';
  return { id: `muk-${level}-${index}`, level, ruleId: mukLevels[Math.min(level, mukLevels.length) - 1].ruleId, phase, opponent, attacker: index % 2 === 0 ? 'CHILD' : 'PIKI' };
}

export function correctMukChoice(problem: MukProblem): Gesture {
  if (problem.phase === 'MATCH' || problem.phase === 'DUEL') return problem.opponent;
  return beats[problem.opponent];
}

export function judgeMukProblem(problem: MukProblem, choice: Gesture): boolean {
  return choice === correctMukChoice(problem);
}

export function gestureName(gesture: Gesture): string {
  return gesture === 'ROCK' ? '바위' : gesture === 'SCISSORS' ? '가위' : '보';
}
