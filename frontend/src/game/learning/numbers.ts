import type { LearningLevelConfig } from './types';

export type NumberProblemKind = 'MISSING' | 'COMPARE' | 'ADD' | 'SUBTRACT' | 'MIXED';
export interface NumberProblem {
  id: string;
  level: number;
  ruleId: string;
  kind: NumberProblemKind;
  left: number;
  right: number;
  answer: number;
  missing?: number;
  operator?: '+' | '-';
  options: number[];
}

export const numberLevels: readonly LearningLevelConfig[] = [
  { id: 1, title: '빠진 숫자 찾기', ruleId: 'number-order', warmup: true },
  { id: 2, title: '큰 수와 작은 수', ruleId: 'number-compare' },
  { id: 3, title: '그림으로 더하기', ruleId: 'number-add' },
  { id: 4, title: '그림으로 빼기', ruleId: 'number-subtract' },
  { id: 5, title: '숫자 섞어 보기', ruleId: 'number-mixed' },
];

function options(answer: number): number[] {
  return [...new Set([answer, Math.max(0, answer - 1), answer + 1, answer + 2])].sort((a, b) => a - b);
}

export function createNumberProblem(level: number, index: number): NumberProblem {
  if (level === 1) {
    const missing = 2 + ((index * 2) % 7);
    return { id: `number-${level}-${index}`, level, ruleId: 'number-order', kind: 'MISSING', left: missing - 1, right: missing + 1, missing, answer: missing, options: options(missing) };
  }
  if (level === 2) {
    const left = 3 + ((index * 3) % 8);
    const right = 2 + ((index * 5) % 9);
    const answer = left === right ? left : Math.max(left, right);
    return { id: `number-${level}-${index}`, level, ruleId: 'number-compare', kind: 'COMPARE', left, right, answer, options: options(answer) };
  }
  if (level === 3) {
    const left = 1 + (index % 5);
    const right = 1 + ((index + 2) % 5);
    const answer = left + right;
    return { id: `number-${level}-${index}`, level, ruleId: 'number-add', kind: 'ADD', left, right, answer, operator: '+', options: options(answer) };
  }
  if (level === 4) {
    const left = 4 + (index % 6);
    const right = 1 + ((index + 1) % Math.min(4, left));
    const answer = left - right;
    return { id: `number-${level}-${index}`, level, ruleId: 'number-subtract', kind: 'SUBTRACT', left, right, answer, operator: '-', options: options(answer) };
  }
  const left = 2 + (index % 7);
  const right = 1 + ((index * 2) % 5);
  const subtract = index % 2 === 0;
  const answer = subtract ? left - right : left + right;
  return { id: `number-${level}-${index}`, level, ruleId: 'number-mixed', kind: 'MIXED', left, right, answer, operator: subtract ? '-' : '+', options: options(answer) };
}

export function isNumberAnswer(problem: NumberProblem, value: number): boolean {
  return value === problem.answer;
}
