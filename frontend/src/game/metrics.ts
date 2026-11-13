export type MetricName = 'ruleDecision' | 'resultPaint' | 'roundAdvancePaint';

interface MetricSummary {
  count: number;
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
}

const samples: Record<MetricName, number[]> = {
  ruleDecision: [], resultPaint: [], roundAdvancePaint: [],
};
const sampleLimit = 300;

function summarize(values: readonly number[]): MetricSummary {
  if (!values.length) return { count: 0, mean: 0, median: 0, p95: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    count: sorted.length,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median,
    p95: sorted[Math.ceil(sorted.length * .95) - 1],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

export function recordMetric(name: MetricName, elapsedMs: number) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return;
  const values = samples[name];
  values.push(elapsedMs);
  if (values.length > sampleLimit) values.splice(0, values.length - sampleLimit);
}

export function metricSummary(): Record<MetricName, MetricSummary> {
  return {
    ruleDecision: summarize(samples.ruleDecision),
    resultPaint: summarize(samples.resultPaint),
    roundAdvancePaint: summarize(samples.roundAdvancePaint),
  };
}

export function resetMetrics() {
  (Object.keys(samples) as MetricName[]).forEach((name) => { samples[name].length = 0; });
}

declare global {
  interface Window {
    __PIKIPICK_METRICS__?: { summary: typeof metricSummary; reset: typeof resetMetrics };
  }
}

/** 개발 환경 전용 개발자 도구 API이며, 유아 화면에는 측정값 UI를 표시하지 않는다. */
export function installMetricsDevtools() {
  window.__PIKIPICK_METRICS__ = { summary: metricSummary, reset: resetMetrics };
}
