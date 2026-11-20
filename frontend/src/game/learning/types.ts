export type LearningGameId = 'MUK_JJI_PPA' | 'COUNTING' | 'NUMBER' | 'PATTERN';

export interface LearningLevelStats {
  attempts: number;
  correct: number;
  independentCorrect: number;
  hintsUsed: number;
  touchEvents: number;
  rulesSeen: string[];
}

export interface LearningProgress {
  version: 1;
  gameId: LearningGameId;
  currentLevel: number;
  currentProblemIndex: number;
  attempts: number;
  correct: number;
  hintsUsed: number;
  touchEvents: number;
  observedRules: string[];
  recentResults: Array<'correct' | 'retry'>;
  levelStats: Record<string, LearningLevelStats>;
  lastProblem: Record<string, unknown> | null;
  updatedAt: number;
}

export interface LearningLevelConfig {
  id: number;
  title: string;
  ruleId: string;
  warmup?: boolean;
}

export const learningGameIds: readonly LearningGameId[] = ['MUK_JJI_PPA', 'COUNTING', 'NUMBER', 'PATTERN'];

export function isLearningGameId(value: unknown): value is LearningGameId {
  return typeof value === 'string' && (learningGameIds as readonly string[]).includes(value);
}
