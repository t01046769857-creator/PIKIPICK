import type { LearningLevelConfig } from './types';

export type PatternSymbol = '●' | '■' | '▲' | '★';
export interface PatternProblem {
  id: string;
  level: number;
  ruleId: string;
  sequence: PatternSymbol[];
  answer: PatternSymbol;
  options: PatternSymbol[];
  blankCount: number;
}

export const patternLevels: readonly LearningLevelConfig[] = [
  { id: 1, title: '같은 그림 찾기', ruleId: 'pattern-match', warmup: true },
  { id: 2, title: 'AB 반복', ruleId: 'pattern-ab' },
  { id: 3, title: 'AAB·ABB·ABC', ruleId: 'pattern-abc' },
  { id: 4, title: '색과 모양 순서', ruleId: 'pattern-complex' },
  { id: 5, title: '빈칸 여러 개 채우기', ruleId: 'pattern-memory' },
];

const symbols: readonly PatternSymbol[] = ['●', '■', '▲', '★'];

export function createPatternProblem(level: number, index: number): PatternProblem {
  const first = symbols[index % 3];
  const second = symbols[(index + 1) % 3];
  const third = symbols[(index + 2) % 3];
  let base: PatternSymbol[];
  if (level === 1) base = [first, first, '★'];
  else if (level === 2) base = [first, second, first, second, '★'];
  else if (level === 3) base = [first, first, second, first, first, second, '★'];
  else if (level === 4) base = [first, second, third, first, second, '★'];
  else base = [first, second, first, second, first, '★', second];
  const answer = level === 1 ? first : level === 2 ? second : level === 3 ? second : level === 4 ? third : second;
  const options = [answer, first, second, third].filter((item, optionIndex, list) => list.indexOf(item) === optionIndex && optionIndex < 4) as PatternSymbol[];
  return { id: `pattern-${level}-${index}`, level, ruleId: patternLevels[Math.min(level, patternLevels.length) - 1].ruleId, sequence: base, answer, options, blankCount: level === 5 ? 2 : 1 };
}

export function isPatternAnswer(problem: PatternProblem, value: PatternSymbol): boolean {
  return value === problem.answer;
}
