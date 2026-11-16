import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TeacherChildAccessBlocked, TeacherDashboard, TeacherLogin } from './TeacherPortal';
import { TeacherDemoDashboard, teacherDemoSessions } from './TeacherDemoDashboard';

describe('교사용 준비 화면', () => {
  it('로그인 화면은 실제 아동 기록을 표시하지 않는다고 안내한다', () => {
    const html = renderToStaticMarkup(<TeacherLogin />);
    expect(html).toContain('현재는 실제 아동 기록을 표시하지 않습니다.');
    expect(html).toContain('/teacher/dashboard');
  });

  it('교사용 대시보드는 담당 아동 연결 전 빈 상태를 보인다', () => {
    const html = renderToStaticMarkup(<TeacherDashboard />);
    expect(html).toContain('담당 아동을 연결해 주세요');
    expect(html).not.toContain('김');
  });

  it('개별 아동 URL은 인증 전 접근 차단 안내를 보인다', () => {
    const html = renderToStaticMarkup(<TeacherChildAccessBlocked />);
    expect(html).toContain('아직 열 수 없어요');
  });

  it('준비 화면은 실제 기록과 분리된 대시보드 데모로 이동한다', () => {
    const html = renderToStaticMarkup(<TeacherDashboard />);
    expect(html).toContain('/teacher/demo/child');
    expect(html).toContain('대시보드 데모 보기');
  });

  it('개인 아동 데모는 놀이 기록, 개인 변화, 그림책 연계 활동을 모두 표시한다', () => {
    const html = renderToStaticMarkup(<TeacherDemoDashboard />);
    expect(html).toContain('데모 데이터 · 실제 아동 기록이 아닙니다');
    expect(html).toContain('최근 놀이 경험');
    expect(html).toContain('아동 A의 이전 경험과 최근 경험');
    expect(html).toContain('교사를 위한 주제 중심 활동 예시');
    expect(html).toContain('가위바위보 · 규칙 연습');
  });

  it('데모 기록의 요약 원본은 실제 API가 아닌 정적 단일 아동 데이터다', () => {
    expect(teacherDemoSessions).toHaveLength(4);
    expect(teacherDemoSessions.reduce((sum, item) => sum + item.attempts, 0)).toBe(10);
    expect(teacherDemoSessions.filter(item => item.retried)).toHaveLength(2);
  });
});
