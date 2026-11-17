import { BrandLogo } from './BrandLogo';
import { PikiCharacter } from './PikiCharacter';
import { useState, type FormEvent } from 'react';
import { loginTeacher } from '../teacher/teacherApi';
import { TeacherLmsDashboard } from './TeacherLmsDashboard';
import './TeacherPortal.css';

function TeacherShell({ children }: { children: React.ReactNode }) {
  return <main className="teacher-portal"><header className="teacher-portal__header"><a href="/teacher/login" aria-label="피키픽 교사용 시작"><BrandLogo /><span>교사용 관찰 공간</span></a><a className="teacher-portal__child-link" href="/play">아이 놀이로</a></header>{children}</main>;
}

export function TeacherLogin() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await loginTeacher(email, password); window.location.assign('/teacher/dashboard'); } catch { setError('이메일 또는 비밀번호를 확인해 주세요.'); } finally { setBusy(false); } };
  return <TeacherShell><section className="teacher-login"><PikiCharacter expression="curious" size="medium" /><div><span className="teacher-kicker">교사용 LMS</span><h1>아이의 놀이를 함께 살펴봐요</h1><p>권한이 있는 담당 아동의 저장된 기록만 확인할 수 있어요.</p><form className="teacher-login__form" onSubmit={submit}><label>이메일<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" /></label><label>비밀번호<input required type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>{error && <p role="alert">{error}</p>}<button className="teacher-primary" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button></form><small>계정과 담당 관계는 관리자 승인 절차로만 설정됩니다.</small></div></section></TeacherShell>;
}

export function TeacherDashboard() {
  return <TeacherShell><TeacherLmsDashboard /><p className="teacher-demo-link"><a href="/teacher/demo/child">데모 데이터 화면 보기</a></p></TeacherShell>;
}

export function TeacherChildDashboard({ childId }: { childId: string }) {
  return <TeacherShell><TeacherLmsDashboard childId={childId} /></TeacherShell>;
}

export function TeacherChildAccessBlocked() {
  return <TeacherShell><section className="teacher-blocked"><PikiCharacter expression="encourage" size="medium" /><span className="teacher-kicker">권한 확인 필요</span><h1>이 아이의 기록은 아직 열 수 없어요</h1><p>교사 인증과 담당 아동 권한이 설정되기 전에는 개인 놀이 기록을 URL로 직접 열 수 없습니다.</p><a className="teacher-primary" href="/teacher/login">교사 시작 화면으로</a></section></TeacherShell>;
}
