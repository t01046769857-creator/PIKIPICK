import { BrandLogo } from './BrandLogo';
import { PikiCharacter } from './PikiCharacter';
import './TeacherPortal.css';

function TeacherShell({ children }: { children: React.ReactNode }) {
  return <main className="teacher-portal"><header className="teacher-portal__header"><a href="/teacher/login" aria-label="피키픽 교사용 시작"><BrandLogo /><span>교사용 관찰 공간</span></a><a className="teacher-portal__child-link" href="/play">아이 놀이로</a></header>{children}</main>;
}

export function TeacherLogin() {
  return <TeacherShell><section className="teacher-login"><PikiCharacter expression="curious" size="medium" /><div><span className="teacher-kicker">교사용 LMS · 준비 단계</span><h1>아이의 놀이를 함께 살펴봐요</h1><p>교사 계정 인증과 담당 아동 연결이 준비되면, 권한이 있는 기록만 이곳에서 확인할 수 있어요.</p><a className="teacher-primary" href="/teacher/dashboard">대시보드 구조 보기</a><small>현재는 실제 아동 기록을 표시하지 않습니다.</small></div></section></TeacherShell>;
}

export function TeacherDashboard() {
  return <TeacherShell><section className="teacher-dashboard"><div className="teacher-dashboard__heading"><span className="teacher-kicker">교사용 LMS · 인증 연결 전</span><h1>담당 아이의 놀이 흐름</h1><p>순위나 비교 대신, 한 아이의 이전 놀이 경험과 다음 활동을 살펴보는 공간입니다.</p></div><div className="teacher-empty"><span aria-hidden="true">⌁</span><h2>담당 아동을 연결해 주세요</h2><p>인증과 담당 관계가 아직 설정되지 않아 실제 아동 이름, 놀이 기록, 성취 정보는 표시하지 않습니다.</p><a className="teacher-primary teacher-demo-link" href="/teacher/demo/child">대시보드 데모 보기</a></div><div className="teacher-sections" aria-label="인증 후 제공될 관찰 영역"><section><h2>놀이 기록</h2><p>참여 활동, 시도, 규칙 선택, 다시 도전한 경험을 확인합니다.</p></section><section><h2>개인 변화</h2><p>다른 아이와 비교하지 않고, 같은 아이의 이전 경험을 기준으로 봅니다.</p></section><section><h2>그림책·다음 활동</h2><p>도서 API 승인과 교사 선택 기능이 준비되면 관련 활동을 제안합니다.</p></section></div></section></TeacherShell>;
}

export function TeacherChildAccessBlocked() {
  return <TeacherShell><section className="teacher-blocked"><PikiCharacter expression="encourage" size="medium" /><span className="teacher-kicker">권한 확인 필요</span><h1>이 아이의 기록은 아직 열 수 없어요</h1><p>교사 인증과 담당 아동 권한이 설정되기 전에는 개인 놀이 기록을 URL로 직접 열 수 없습니다.</p><a className="teacher-primary" href="/teacher/login">교사 시작 화면으로</a></section></TeacherShell>;
}
