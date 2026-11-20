import type { LearningLevelConfig } from './types';

export interface CountingItem { id: number; x: number; y: number; color: string; }
export interface CountingProblem {
  id: string;
  level: number;
  ruleId: string;
  target: number;
  items: CountingItem[];
  options: number[];
  usesHands: boolean;
}

export const countingLevels: readonly LearningLevelConfig[] = [
  { id: 1, title: '0부터 10까지 세기', ruleId: 'count-0-10', warmup: true },
  { id: 2, title: '11부터 20까지 세기', ruleId: 'count-11-20' },
  { id: 3, title: '21부터 30까지 세기', ruleId: 'count-21-30' },
  { id: 4, title: '31부터 50까지 세기', ruleId: 'count-31-50' },
];

const colors = ['#f3a66f', '#f3c96b', '#83b99a', '#8db5df', '#d88bb0'];

function rangeForLevel(level: number): [number, number] {
  if (level <= 1) return [0, 10];
  if (level === 2) return [11, 20];
  if (level === 3) return [21, 30];
  return [31, 50];
}

export function createCountingProblem(level: number, index: number): CountingProblem {
  const [min, max] = rangeForLevel(level);
  const target = min + ((index * 3 + level) % (max - min + 1));
  const columns = level >= 4 ? 10 : level >= 3 ? 8 : 5;
  const items = Array.from({ length: target }, (_, itemIndex) => ({
    id: itemIndex,
    x: 8 + (itemIndex % columns) * (84 / Math.max(1, columns - 1)),
    y: 12 + Math.floor(itemIndex / columns) * (76 / Math.max(1, Math.ceil(target / columns))),
    color: colors[itemIndex % colors.length],
  }));
  const options = [...new Set([target, Math.max(min, target - 1), Math.min(max, target + 1), Math.min(max, target + 2)])].sort((a, b) => a - b);
  return { id: `count-${level}-${index}`, level, ruleId: countingLevels[Math.min(level, countingLevels.length) - 1].ruleId, target, items, options, usesHands: level === 1 && target <= 10 };
}

export function isCountingAnswer(problem: CountingProblem, value: number): boolean {
  return problem.target === value;
}
