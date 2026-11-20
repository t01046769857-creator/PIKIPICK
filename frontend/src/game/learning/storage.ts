import type { LearningGameId, LearningLevelStats, LearningProgress } from './types';
import { isLearningGameId, learningGameIds } from './types';

export const learningStorageKey = 'pikipick.learning-progress.v1';
export const learningLastGameKey = 'pikipick.learning-last-game.v1';

function emptyLevelStats(): LearningLevelStats {
  return { attempts: 0, correct: 0, independentCorrect: 0, hintsUsed: 0, touchEvents: 0, rulesSeen: [] };
}

export function createLearningProgress(gameId: LearningGameId): LearningProgress {
  return {
    version: 1,
    gameId,
    currentLevel: 1,
    currentProblemIndex: 0,
    attempts: 0,
    correct: 0,
    hintsUsed: 0,
    touchEvents: 0,
    observedRules: [],
    recentResults: [],
    levelStats: {},
    lastProblem: null,
    updatedAt: Date.now(),
  };
}

function isLevelStats(value: unknown): value is LearningLevelStats {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LearningLevelStats>;
  return typeof item.attempts === 'number' && typeof item.correct === 'number'
    && typeof item.independentCorrect === 'number' && typeof item.hintsUsed === 'number'
    && typeof item.touchEvents === 'number' && Array.isArray(item.rulesSeen)
    && item.rulesSeen.every(rule => typeof rule === 'string');
}

function isProgress(value: unknown, gameId: LearningGameId): value is LearningProgress {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LearningProgress>;
  return item.version === 1 && item.gameId === gameId
    && Number.isInteger(item.currentLevel) && Number(item.currentLevel) >= 1
    && Number.isInteger(item.currentProblemIndex) && Number(item.currentProblemIndex) >= 0
    && typeof item.attempts === 'number' && typeof item.correct === 'number'
    && typeof item.hintsUsed === 'number' && typeof item.touchEvents === 'number'
    && Array.isArray(item.observedRules) && item.observedRules.every(rule => typeof rule === 'string')
    && Array.isArray(item.recentResults) && item.recentResults.every(result => result === 'correct' || result === 'retry')
    && !!item.levelStats && typeof item.levelStats === 'object'
    && Object.values(item.levelStats).every(isLevelStats);
}

function readAll(): Partial<Record<LearningGameId, LearningProgress>> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(learningStorageKey) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Partial<Record<LearningGameId, LearningProgress>> = {};
    for (const gameId of learningGameIds) {
      const candidate = (parsed as Record<string, unknown>)[gameId];
      if (isProgress(candidate, gameId)) result[gameId] = candidate;
    }
    return result;
  } catch {
    return {};
  }
}

export function readLearningProgress(gameId: LearningGameId): LearningProgress {
  return readAll()[gameId] ?? createLearningProgress(gameId);
}

export function saveLearningProgress(progress: LearningProgress): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll();
    all[progress.gameId] = progress;
    window.localStorage.setItem(learningStorageKey, JSON.stringify(all));
    window.localStorage.setItem(learningLastGameKey, progress.gameId);
  } catch {
    // Storage failures must not interrupt the child's current play.
  }
}

export function readLastLearningGame(): LearningGameId | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(learningLastGameKey);
  return isLearningGameId(value) ? value : null;
}

export function updateLearningProgress(
  progress: LearningProgress,
  event: { ruleId: string; correct: boolean; usedHint?: boolean; touchEvents?: number; problem?: Record<string, unknown> },
): LearningProgress {
  const result: 'correct' | 'retry' = event.correct ? 'correct' : 'retry';
  const levelKey = String(progress.currentLevel);
  const previous = progress.levelStats[levelKey] ?? emptyLevelStats();
  const rulesSeen = previous.rulesSeen.includes(event.ruleId) ? previous.rulesSeen : [...previous.rulesSeen, event.ruleId];
  const nextStats: LearningLevelStats = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (event.correct ? 1 : 0),
    independentCorrect: previous.independentCorrect + (event.correct && !event.usedHint ? 1 : 0),
    hintsUsed: previous.hintsUsed + (event.usedHint ? 1 : 0),
    touchEvents: previous.touchEvents + (event.touchEvents ?? 0),
    rulesSeen,
  };
  return {
    ...progress,
    currentProblemIndex: progress.currentProblemIndex + 1,
    attempts: progress.attempts + 1,
    correct: progress.correct + (event.correct ? 1 : 0),
    hintsUsed: progress.hintsUsed + (event.usedHint ? 1 : 0),
    touchEvents: progress.touchEvents + (event.touchEvents ?? 0),
    observedRules: progress.observedRules.includes(event.ruleId) ? progress.observedRules : [...progress.observedRules, event.ruleId],
    recentResults: [...progress.recentResults, result].slice(-12),
    levelStats: { ...progress.levelStats, [levelKey]: nextStats },
    lastProblem: event.problem ?? progress.lastProblem,
    updatedAt: Date.now(),
  };
}

export function chooseLearningLevel(progress: LearningProgress, level: number): LearningProgress {
  return { ...progress, currentLevel: Math.max(1, Math.floor(level)), currentProblemIndex: 0, updatedAt: Date.now() };
}

export function suggestNextLevel(progress: LearningProgress): boolean {
  const stats = progress.levelStats[String(progress.currentLevel)];
  if (!stats || stats.attempts < 3) return false;
  return stats.independentCorrect >= 2 && stats.rulesSeen.length >= 1;
}
