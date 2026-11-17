export type TeacherChild = { id: string; age_band: number | null; assigned_at: string };
export type TeacherDashboardData = {
  child: { id: string; age_band: number | null };
  scope: 'HOME_PLAY_HISTORY';
  shared_from: string;
  session_count: number;
  period_days: number;
  summary: { participations: number; attempts: number; target_choices: number; target_misses: number; retry_count: number | null; retry_supported: boolean };
  activities: { activity: string; activity_slug: string; participations: number; attempts: number; target_choices: number; target_misses: number }[];
  trend: { date: string; participations: number; attempts: number; target_choices: number }[];
  recent_sessions: { date: string; activity: string; activity_slug: string; rule: string | null; attempts: number; target_choices: number; target_misses: number; status: string }[];
  weekday_distribution: { weekday: number; participations: number; attempts: number }[];
  rule_distribution: { rule: string; attempts: number; target_choices: number; target_misses: number }[];
  gesture_distribution: { gesture: string; count: number }[];
  recent_events: { id: string; session_id: string; occurred_at: string | null; event_type: string; round_index: number | null; success: boolean | null; details: { mode?: string; player?: string; opponent?: string } }[];
  metric_evidence: { activity_slug: string; period_days: number; event_count: number; formula: string; data_version: string; limitations: string[]; metrics: { key: string; value: number; definition: string }[] }[];
  content_metrics: { activity_slug: string; metrics: { key: string; value: number; definition: string }[]; unsupported: boolean; unavailable_metrics?: string[] }[];
  education_evidence: { status: 'unsupported'; reason: string };
  recommendation_basis: string;
  book_recommendation_topic: string | null;
  recommendations: { kind: string; title: string; reason: string; action: string; available_path: string | null }[];
  book_recommendations: { status: string; reason: string };
};

const tokenKey = 'pikipick.teacher.access-token.v1';
const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function token() { return sessionStorage.getItem(tokenKey); }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 ? 'CHILD_FORBIDDEN' : 'REQUEST_FAILED');
  return response.json() as Promise<T>;
}

export async function loginTeacher(email: string, password: string) {
  const response = await fetch(`${apiBase}/api/teacher/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error('LOGIN_FAILED');
  const payload = await response.json() as { access_token: string };
  sessionStorage.setItem(tokenKey, payload.access_token);
}

export function clearTeacherSession() { sessionStorage.removeItem(tokenKey); }
export function hasTeacherSession() { return Boolean(token()); }
export const getTeacherChildren = () => request<{ children: TeacherChild[] }>('/api/teacher/children');
export const getTeacherDashboard = (id: string, days: number) => request<TeacherDashboardData>(`/api/manager/children/${encodeURIComponent(id)}/home-dashboard?days=${days}`);
export const issueInstitutionPlay = (id: string) => request<{ institution_play_token: string; player_id: string; expires_at: string }>(
  `/api/teacher/children/${encodeURIComponent(id)}/institution-play`, { method: 'POST', body: JSON.stringify({}) });
