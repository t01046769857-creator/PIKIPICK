import { describe, expect, it } from 'vitest';
import { createCountingProblem, isCountingAnswer } from './counting';
import { createMukProblem, correctMukChoice, judgeMukProblem } from './mukJjiPpa';
import { createNumberProblem, isNumberAnswer } from './numbers';
import { createPatternProblem, isPatternAnswer } from './patterns';
import { chooseLearningLevel, createLearningProgress, suggestNextLevel, updateLearningProgress } from './storage';

describe('공통 학습 진행 규칙', () => {
  it('도움 없이 규칙을 적용한 기록을 기준으로 다음 단계를 제안한다', () => {
    let progress = createLearningProgress('MUK_JJI_PPA');
    progress = updateLearningProgress(progress, { ruleId: 'muk-rps', correct: true });
    progress = updateLearningProgress(progress, { ruleId: 'muk-rps', correct: true });
    progress = updateLearningProgress(progress, { ruleId: 'muk-rps', correct: true });
    expect(progress.attempts).toBe(3);
    expect(progress.correct).toBe(3);
    expect(suggestNextLevel(progress)).toBe(true);
    expect(chooseLearningLevel(progress, 2).currentProblemIndex).toBe(0);
  });

  it('힌트 사용과 오답을 탈락으로 취급하지 않고 기록한다', () => {
    let progress = createLearningProgress('COUNTING');
    progress = updateLearningProgress(progress, { ruleId: 'count-0-10', correct: false, usedHint: true, touchEvents: 4 });
    expect(progress.attempts).toBe(1);
    expect(progress.correct).toBe(0);
    expect(progress.hintsUsed).toBe(1);
    expect(progress.touchEvents).toBe(4);
    expect(progress.currentProblemIndex).toBe(1);
  });
});

describe('네 가지 놀이 규칙 엔진', () => {
  it('묵찌빠는 단계에 따라 이기는 손과 같은 손 규칙을 분리한다', () => {
    const rps = createMukProblem(1, 0);
    expect(judgeMukProblem(rps, correctMukChoice(rps))).toBe(true);
    const match = createMukProblem(3, 1);
    expect(correctMukChoice(match)).toBe(match.opponent);
    expect(judgeMukProblem(match, match.opponent)).toBe(true);
  });

  it('수 세기는 11 이상에서 손가락 대신 실제 사물 개수를 만든다', () => {
    const small = createCountingProblem(1, 0);
    const large = createCountingProblem(2, 0);
    expect(small.usesHands).toBe(true);
    expect(large.usesHands).toBe(false);
    expect(large.items).toHaveLength(large.target);
    expect(isCountingAnswer(large, large.target)).toBe(true);
  });

  it('숫자 놀이는 순서·비교·연산 단계의 정답을 분리한다', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const problem = createNumberProblem(level, 0);
      expect(isNumberAnswer(problem, problem.answer)).toBe(true);
    }
  });

  it('패턴 놀이는 단계별 반복 규칙과 다음 기호를 제공한다', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const problem = createPatternProblem(level, 0);
      expect(problem.sequence.length).toBeGreaterThan(2);
      expect(isPatternAnswer(problem, problem.answer)).toBe(true);
    }
  });
});
