import { PikiCharacter } from './PikiCharacter';
import { PikiHand } from './PikiHand';
import './SecretLandDashboard.css';

export interface SecretBadge {
  id: 'FIRST_SUCCESS' | 'TRY_AGAIN' | 'BRAVE_SUCCESS' | 'FIVE_SUCCESSES' | 'NEW_ACTIVITY' | 'NEW_PATH';
  name: string;
  symbol: string;
  condition: string;
  description: string;
  tone: 'sun' | 'mint' | 'peach' | 'sky' | 'violet' | 'cream';
}

export const secretBadges: readonly SecretBadge[] = [
  { id: 'FIRST_SUCCESS', name: '첫 걸음 별', symbol: '✦', condition: '처음 성공했을 때', description: '처음으로 끝까지 도전한 용기를 기억해요.', tone: 'sun' },
  { id: 'TRY_AGAIN', name: '토끼 발자국', symbol: '⌁', condition: '실패 뒤 다시 도전했을 때', description: '한 번 더 해 본 마음을 기억해요.', tone: 'mint' },
  { id: 'BRAVE_SUCCESS', name: '용감한 하트', symbol: '♥', condition: '실패 뒤 성공했을 때', description: '포기하지 않고 해낸 순간을 기억해요.', tone: 'peach' },
  { id: 'FIVE_SUCCESSES', name: '햇살 리본', symbol: '⌂', condition: '성공을 차곡차곡 모았을 때', description: '즐겁게 놀이를 이어 간 시간을 기억해요.', tone: 'sky' },
  { id: 'NEW_ACTIVITY', name: '새 놀이 씨앗', symbol: '✿', condition: '새 놀이를 처음 만났을 때', description: '새로운 것을 궁금해한 마음을 기억해요.', tone: 'violet' },
  { id: 'NEW_PATH', name: '비밀 열쇠', symbol: '⚿', condition: '새 공간을 발견했을 때', description: '피키와 함께 찾은 새 길을 기억해요.', tone: 'cream' },
];

function BadgeShape({ badge, locked = false, large = false }: { badge: SecretBadge; locked?: boolean; large?: boolean }) {
  return <span className={`secret-badge secret-badge--${badge.tone} ${locked ? 'is-locked' : ''} ${large ? 'is-large' : ''}`} aria-label={locked ? '아직 찾지 못한 배지' : badge.name}>{badge.symbol}</span>;
}

export function SecretLandDashboard({ discovered, onDiscover, onBadges, onPlay }: { discovered: boolean; onDiscover: () => void; onBadges: () => void; onPlay: () => void }) {
  return <div className="secret-land">
    <p className="secret-land__demo">데모 비밀나라 · 실제 놀이 기록과 연결되지 않아요</p>
    <section className="secret-chest" aria-label="나의 배지함">
      <button type="button" className="secret-chest__button" onClick={onBadges} aria-label="나의 배지함 열기">
        <span className="secret-chest__icon" aria-hidden="true"><i /></span><span>나의 배지함</span>
      </button>
    </section>
    <section className="secret-map" aria-label="피키픽 비밀나라 탐험 지도">
      <div className="secret-map__heading"><span>피키픽 비밀나라</span><h2>피키와 비밀길을 찾아요</h2></div>
      <div className="secret-map__sky" aria-hidden="true"><i /><i /></div>
      <div className="secret-map__path" aria-hidden="true" />
      <div className="secret-map__home" aria-hidden="true"><i /><b>시작</b></div>
      <button type="button" className="secret-map__rps" onClick={onPlay} aria-label="가위바위보 들판에서 놀이 선택으로 이동">
        <span><PikiHand decorative gesture="ROCK" /><PikiHand decorative gesture="SCISSORS" /></span><b>가위바위보 들판</b>
      </button>
      <div className="secret-map__piki"><PikiCharacter expression={discovered ? 'successHappy' : 'curious'} size="medium" /><span>피키</span></div>
      <button type="button" className={`secret-map__hidden-place ${discovered ? 'is-discovered' : ''}`} onClick={onDiscover} aria-label={discovered ? '새로 발견한 이야기 숲' : '데모로 새 공간 발견하기'}>
        <i aria-hidden="true">{discovered ? '✿' : '?'}</i><b>{discovered ? '이야기 숲' : '아직 비밀이에요'}</b><small>{discovered ? '새 길을 찾았어요!' : '눌러서 데모 보기'}</small>
      </button>
      <div className="secret-map__ground" aria-hidden="true" />
      {discovered && <div className="secret-map__celebration" role="status"><BadgeShape badge={secretBadges[5]} /><span>새 길을 찾았어!</span></div>}
    </section>
    <section className="secret-play">
      <button type="button" onClick={onPlay}><span aria-hidden="true">▷</span> 놀이 선택</button>
    </section>
  </div>;
}

export function SecretBadgeCollection({ discovered, onSelect, onPlay }: { discovered: boolean; onSelect: (badge: SecretBadge) => void; onPlay: () => void }) {
  const earnedIds = new Set((discovered ? secretBadges : secretBadges.slice(0, 2)).map(badge => badge.id));
  return <div className="secret-book">
    <header><PikiCharacter expression="curious" size="small" /><div><span>피키픽 비밀나라</span><h2>나의 배지 도감</h2><p>찾은 배지를 눌러 이야기를 들어 봐요.</p></div></header>
    <div className="secret-book__grid" role="list" aria-label="배지 도감">
      {secretBadges.map(badge => { const locked = !earnedIds.has(badge.id); return <button type="button" role="listitem" key={badge.id} disabled={locked} className="secret-book__badge" onClick={() => onSelect(badge)} aria-label={locked ? '아직 찾지 못한 배지' : `${badge.name}, 얻은 이유 보기`}><BadgeShape badge={badge} locked={locked} /><strong>{locked ? '비밀 배지' : badge.name}</strong><small>{locked ? '다음 모험에서 만나요' : badge.condition}</small></button>; })}
    </div>
    <button type="button" className="secret-book__play" onClick={onPlay}>새 놀이 만나기</button>
  </div>;
}

export function SecretBadgeDetail({ badge, onClose }: { badge: SecretBadge; onClose: () => void }) {
  return <div className="secret-detail-backdrop" role="presentation"><section className="secret-detail" role="dialog" aria-modal="true" aria-labelledby="secret-badge-title"><PikiCharacter expression="encourage" size="medium" /><BadgeShape badge={badge} large /><span>피키가 알려 주는 배지 이야기</span><h2 id="secret-badge-title">{badge.name}</h2><p>{badge.description}</p><b>{badge.condition}</b><button type="button" className="primary" onClick={onClose}>배지 도감으로</button></section></div>;
}
