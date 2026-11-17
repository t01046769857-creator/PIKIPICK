import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TeacherChildAccessBlocked, TeacherDashboard, TeacherLogin } from './TeacherPortal';
import { teacherDemoSessions } from './TeacherDemoDashboard';

describe('teacher portal routes', () => {
  it('renders a credential form without embedding a teacher account', () => {
    const html = renderToStaticMarkup(<TeacherLogin />);
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain('teacher-test@example.invalid');
  });

  it('keeps the real dashboard and demo dashboard as separate routes', () => {
    const html = renderToStaticMarkup(<TeacherDashboard />);
    expect(html).toContain('/teacher/demo/child');
    expect(html).not.toContain('demo-01');
  });

  it('keeps the blocked child route pointed to teacher login', () => {
    const html = renderToStaticMarkup(<TeacherChildAccessBlocked />);
    expect(html).toContain('/teacher/login');
  });

  it('keeps demo metrics derived from its static source data', () => {
    expect(teacherDemoSessions).toHaveLength(4);
    expect(teacherDemoSessions.reduce((sum, item) => sum + item.attempts, 0)).toBe(10);
    expect(teacherDemoSessions.filter(item => item.retried)).toHaveLength(2);
  });
});
