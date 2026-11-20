import { useMemo, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import './TeacherPortal.css';
import './TeacherDemoDashboard.css';

type DemoSession = { id: string; date: string; daysAgo: number; activity: string; rule: string; attempts: number; targetChoices: number; retried: boolean; note: string };

export const teacherDemoSessions: DemoSession[] = [
  { id: 'demo-01', date: '5월 8일', daysAgo: 16, activity: '가위바위보', rule: '규칙 연습', attempts: 3, targetChoices: 2, retried: true, note: '피키의 손을 보고 다시 골라 보았어요.' },
  { id: 'demo-02', date: '5월 14일', daysAgo: 10, activity: '가위바위보', rule: '이기기', attempts: 2, targetChoices: 1, retried: false, note: '이기는 손을 골라 놀이를 이어 갔어요.' },
  { id: 'demo-03', date: '5월 20일', daysAgo: 4, activity: '가위바위보', rule: '비기기', attempts: 3, targetChoices: 2, retried: true, note: '같은 손을 찾으며 다시 도전했어요.' },
  { id: 'demo-04', date: '5월 23일', daysAgo: 1, activity: '가위바위보', rule: '지기', attempts: 2, targetChoices: 2, retried: false, note: '목표에 맞는 손을 스스로 골랐어요.' },
];

const badges = [
  ['🌱', '처음 해 봤어요', '가위바위보 규칙 연습을 처음 경험한 데모 배지'],
  ['🔁', '다시 해 봤어요', '어려웠던 선택 뒤에 다시 시도한 데모 배지'],
  ['🧩', '규칙을 찾았어요', '목표에 맞는 손을 골라 본 데모 배지'],
] as const;
const periods = [{ id: '7', label: '최근 7일', days: 7 }, { id: '30', label: '최근 30일', days: 30 }, { id: 'all', label: '전체 데모', days: Infinity }] as const;

function LegacyTeacherDemoDashboard() {
  const [periodId, setPeriodId] = useState<(typeof periods)[number]['id']>('all');
  const period = periods.find(item => item.id === periodId) ?? periods[2];
  const records = useMemo(() => teacherDemoSessions.filter(item => item.daysAgo <= period.days), [period.days]);
  const total = (key: 'attempts' | 'targetChoices') => records.reduce((sum, item) => sum + item[key], 0);
  const first = teacherDemoSessions[0];
  const latest = records.at(-1) ?? teacherDemoSessions.at(-1)!;

  return <main className="teacher-portal teacher-demo"><header className="teacher-portal__header"><a href="/teacher/dashboard" aria-label="PIKIPICK Teacher 대시보드로 돌아가기"><BrandLogo /><span>PIKIPICK Teacher</span></a><a className="teacher-portal__child-link" href="/play">아이 놀이로</a></header><section className="teacher-demo__content" aria-label="개인 아동 중심 LMS 대시보드 데모">
    <div className="teacher-demo__notice" role="note">데모 데이터 · 실제 아동 기록이 아닙니다</div>
    <div className="teacher-demo__heading"><div><span className="teacher-kicker">개인 아동 관찰 · 데모</span><h1>아동 A의 놀이 흐름</h1><p>다른 아동과 비교하지 않고, 아동 A가 해 본 놀이와 다음 활동을 준비하는 예시 화면입니다.</p></div><label className="teacher-demo__period">조회 기간<select value={periodId} onChange={event => setPeriodId(event.target.value as typeof periodId)}>{periods.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>
    <section className="teacher-demo__section" aria-labelledby="play-records"><div className="teacher-demo__section-heading"><div><span className="teacher-kicker">놀이 기록</span><h2 id="play-records">최근 놀이 경험</h2></div><p>{period.label} 기준</p></div><div className="teacher-demo__summary"><div><strong>{records.length}</strong><span>놀이 참여</span></div><div><strong>{total('attempts')}</strong><span>시도</span></div><div><strong>{total('targetChoices')}</strong><span>목표에 맞는 선택</span></div><div><strong>{records.filter(item => item.retried).length}</strong><span>다시 도전</span></div></div><ol className="teacher-demo__timeline">{records.slice().reverse().map(item => <li key={item.id}><time>{item.date}</time><div><strong>{item.activity} · {item.rule}</strong><p>{item.note}</p><span>시도 {item.attempts}회 · 목표 선택 {item.targetChoices}회{item.retried ? ' · 다시 도전' : ''}</span></div></li>)}</ol></section>
    <section className="teacher-demo__section teacher-demo__growth" aria-labelledby="growth"><div className="teacher-demo__section-heading"><div><span className="teacher-kicker">성취와 개인별 변화</span><h2 id="growth">아동 A의 이전 경험과 최근 경험</h2></div><p>데모 배지</p></div><div className="teacher-demo__path"><div><span>처음 시도</span><strong>{first.date} · {first.rule}</strong></div><i>→</i><div><span>최근 다시 도전</span><strong>5월 20일 · 비기기</strong></div><i>→</i><div><span>최근 경험</span><strong>{latest.note}</strong></div></div><div className="teacher-demo__badges">{badges.map(([icon, title, description]) => <article key={title}><span aria-hidden="true">{icon}</span><div><strong>{title}</strong><p>{description}</p></div></article>)}</div><p className="teacher-demo__caution">게임의 승패는 규칙 수행 성취와 별도로 보며, 이 화면은 집중력·지능·발달 수준을 평가하지 않습니다.</p></section>
    <section className="teacher-demo__section" aria-labelledby="books"><div className="teacher-demo__section-heading"><div><span className="teacher-kicker">그림책 연계 활동</span><h2 id="books">교사를 위한 주제 중심 활동 예시</h2></div><p>도서 API 미연결</p></div><div className="teacher-demo__book-grid"><article><span className="teacher-demo__book-icon">📖</span><h3>규칙·차례 그림책 연계 예시</h3><p>가위바위보에서 경험한 규칙, 선택, 차례를 그림책을 읽으며 다시 이야기합니다.</p><strong>활동 방법</strong><p>등장인물이 차례를 지키는 장면에서 멈추고 다음 행동을 손짓으로 골라 보게 합니다.</p></article><article><span className="teacher-demo__book-icon">🔢</span><h3>수 세기 그림책 연계 예시</h3><p>향후 손가락 수 세기 놀이를 경험했을 때 사용할 수 있는 수 개념 중심 샘플입니다.</p><strong>후속 놀이</strong><p>교사가 그림책과 활동을 선택한 뒤에만 아이 화면에는 그림과 행동 중심의 놀이로 전달합니다.</p></article></div></section>
  </section></main>;
}

type DemoTab = 'overview' | 'content' | 'evidence' | 'support';

export function TeacherDemoDashboard() {
  const [periodId, setPeriodId] = useState<(typeof periods)[number]['id']>('all');
  const [tab, setTab] = useState<DemoTab>('overview');
  const period = periods.find(item => item.id === periodId) ?? periods[2];
  const records = useMemo(() => teacherDemoSessions.filter(item => item.daysAgo <= period.days), [period.days]);
  const attempts = records.reduce((sum, item) => sum + item.attempts, 0);
  const targetChoices = records.reduce((sum, item) => sum + item.targetChoices, 0);
  const latest = records.at(-1) ?? teacherDemoSessions.at(-1)!;
  const menu = [['overview', '전체 현황'], ['content', '아동별 놀이 기록'], ['evidence', '분석 근거'], ['support', '교육적 점검']] as const;

  return <main className="teacher-portal teacher-demo teacher-demo--workspace"><aside className="teacher-demo__sidebar" aria-label="데모 LMS 메뉴"><div className="teacher-demo__sidebar-brand"><strong>PIKIPICK</strong><span>데모 LMS</span></div><nav>{menu.map(([key, label]) => <button type="button" key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><a href="/teacher/login">실제 교사 로그인</a></aside><section className="teacher-demo__workspace"><header className="teacher-portal__header"><a href="/teacher/dashboard" aria-label="PIKIPICK Teacher 대시보드로 돌아가기"><BrandLogo /><span>PIKIPICK Teacher</span></a><a className="teacher-portal__child-link" href="/play">아이 놀이로</a></header><div className="teacher-demo__content"><div className="teacher-demo__notice" role="note">DEMO · 합성 데이터 · 실제 아동 기록이 아닙니다</div><div className="teacher-demo__heading"><div><span className="teacher-kicker">개인 아동 관찰 · 데모</span><h1>{menu.find(([key]) => key === tab)?.[1]}</h1><p>아동 A의 데모 기록으로 실제 LMS 레이아웃을 확인합니다.</p></div><label className="teacher-demo__period">조회 기간<select value={periodId} onChange={event => setPeriodId(event.target.value as typeof periodId)}>{periods.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>{tab === 'overview' && <div className="teacher-demo__overview-grid"><section className="teacher-demo__panel"><span className="teacher-kicker">놀이 참여</span><h2>최근 놀이 경험</h2><strong className="teacher-demo__big-number">{records.length}</strong><p>선택한 기간의 데모 세션</p></section><section className="teacher-demo__panel"><span className="teacher-kicker">시도 기록</span><h2>놀이 시도</h2><strong className="teacher-demo__big-number">{attempts}</strong><p>실제 데모 원본에서 계산</p></section><section className="teacher-demo__panel teacher-demo__panel--wide"><span className="teacher-kicker">기간별 변화</span><h2>최근 활동 미리보기</h2><ol className="teacher-demo__mini-timeline">{records.slice().reverse().map(item => <li key={item.id}><b>{item.date}</b><span>{item.activity} · {item.rule} · 시도 {item.attempts}회</span></li>)}</ol></section><section className="teacher-demo__panel"><span className="teacher-kicker">담당자 미리보기</span><h2>아동 A</h2><p>최근 경험: {latest.note}</p><p>목표 선택 {targetChoices}회</p></section><section className="teacher-demo__panel"><span className="teacher-kicker">미정</span><h2>기능을 준비 중입니다</h2><p>확정되지 않은 추천·알림 기능은 표시하지 않습니다.</p></section></div>}{tab === 'content' && <section className="teacher-demo__section"><div className="teacher-demo__section-heading"><div><span className="teacher-kicker">아동별 놀이 기록</span><h2>최근 놀이 경험</h2></div><p>{period.label} 기준</p></div><div className="teacher-demo__summary"><div><strong>{records.length}</strong><span>놀이 참여</span></div><div><strong>{attempts}</strong><span>시도</span></div><div><strong>{targetChoices}</strong><span>목표에 맞는 선택</span></div><div><strong>{records.filter(item => item.retried).length}</strong><span>다시 도전</span></div></div><ol className="teacher-demo__timeline">{records.slice().reverse().map(item => <li key={item.id}><time>{item.date}</time><div><strong>{item.activity} · {item.rule}</strong><p>{item.note}</p><span>시도 {item.attempts}회 · 목표 선택 {item.targetChoices}회</span></div></li>)}</ol></section>}{tab === 'evidence' && <section className="teacher-demo__section"><div className="teacher-demo__section-heading"><div><span className="teacher-kicker">분석 근거</span><h2>데모 원본과 계산 기준</h2></div><p>DEMO</p></div><div className="teacher-demo__evidence-grid"><article><strong>시도 횟수</strong><p>선택한 기간의 각 세션 `attempts` 합계</p><small>원본 세션 {records.length}건</small></article><article><strong>목표 선택</strong><p>각 세션 `targetChoices` 합계</p><small>임의의 재도전 수를 만들지 않음</small></article></div></section>}{tab === 'support' && <section className="teacher-demo__section"><div className="teacher-demo__section-heading"><div><span className="teacher-kicker">교육적 점검</span><h2>데모 지원 정보</h2></div><p>실제 기능 아님</p></div><div className="teacher-demo__book-grid">{badges.map(([icon, title, description]) => <article key={title}><span className="teacher-demo__book-icon">{icon}</span><h3>{title}</h3><p>{description}</p></article>)}</div><p className="teacher-demo__caution">데모 배지와 활동 예시는 실제 아동 평가나 발달 판정에 사용되지 않습니다.</p></section>}</div></section></main>;
}
