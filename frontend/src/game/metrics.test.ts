import { describe, expect, it } from 'vitest';
import { metricSummary, recordMetric, resetMetrics } from './metrics';

describe('development metrics', () => {
  it('reports count, mean, median, and p95 from recorded samples', () => {
    resetMetrics();
    [1, 2, 3, 4, 100].forEach(value => recordMetric('ruleDecision', value));
    expect(metricSummary().ruleDecision).toEqual({ count: 5, mean: 22, median: 3, p95: 100, min: 1, max: 100 });
  });
});
