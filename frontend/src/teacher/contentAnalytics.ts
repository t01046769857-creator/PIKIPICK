import type { ApiContent } from '../game/contentCatalog';
import type { TeacherDashboardData } from './teacherApi';

export type ContentAnalyticsModule = {
  slug: string;
  title: string;
  supported: boolean;
  metricLabels: Record<string, string>;
  limitation: string;
};

/** Content-specific contracts keep the shared dashboard independent of RPS. */
export const analyticsModules: Record<string, ContentAnalyticsModule> = {
  'rock-paper-scissors': {
    slug: 'rock-paper-scissors',
    title: '가위바위보',
    supported: true,
    metricLabels: { rule_attempt: '규칙 시도', goal_matched_choice: '목표 일치 선택', goal_not_matched_choice: '목표 불일치 선택' },
    limitation: '현재 이벤트로는 재도전 여부나 발달 수준을 판정하지 않습니다.',
  },
};

export function getAnalyticsModule(content: ApiContent | undefined): ContentAnalyticsModule {
  const registered = content ? analyticsModules[content.slug] : undefined;
  if (registered) return registered;
  return {
    slug: content?.slug ?? 'unknown', title: content?.title ?? '알 수 없는 놀이', supported: false,
    metricLabels: {}, limitation: '콘텐츠별 분석 모듈이 아직 구현되지 않았습니다.',
  };
}

export function metricLabel(module: ContentAnalyticsModule, key: string) {
  return module.metricLabels[key] ?? key;
}

export function contentHasRecordedExperience(data: TeacherDashboardData, slug: string) {
  return data.activities.some(activity => activity.activity_slug === slug);
}
