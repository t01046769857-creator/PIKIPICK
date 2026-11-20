import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { PikiCharacter } from './PikiCharacter';
import { secretBadges, type SecretBadge } from './SecretLandDashboard';
import explorerPikiIdle from '../assets/characters/piki/adventure/piki-explorer-idle-front.png';
import explorerPikiRunLeft from '../assets/characters/piki/adventure/piki-explorer-run-left-source.png';
import explorerPikiRunRight from '../assets/characters/piki/adventure/piki-explorer-run-right-source.png';
import explorerPikiWalkLeft01 from '../assets/characters/piki/adventure/walk-v2/left/piki-walk-left-01.png';
import explorerPikiWalkLeft02 from '../assets/characters/piki/adventure/walk-v2/left/piki-walk-left-02.png';
import explorerPikiWalkLeft03 from '../assets/characters/piki/adventure/walk-v2/left/piki-walk-left-03.png';
import explorerPikiWalkLeft04 from '../assets/characters/piki/adventure/walk-v2/left/piki-walk-left-04.png';
import explorerPikiWalkRight01 from '../assets/characters/piki/adventure/walk-v2/right/piki-walk-right-01.png';
import explorerPikiWalkRight02 from '../assets/characters/piki/adventure/walk-v2/right/piki-walk-right-02.png';
import explorerPikiWalkRight03 from '../assets/characters/piki/adventure/walk-v2/right/piki-walk-right-03.png';
import explorerPikiWalkRight04 from '../assets/characters/piki/adventure/walk-v2/right/piki-walk-right-04.png';
import { badgeAssetByConceptId, badgeAssetById } from '../assets/badges/badgeAssets';
import { secretLandAssets } from '../assets/secret-land/secretLandAssets';
import './LxpSecretLandDashboard.css';

type Props = {
  successCount: number;
  partyCount: number;
  roundCount: number;
  onBadges: () => void;
  onPlay: () => void;
};

function earnedIds(successCount: number): Set<SecretBadge['id']> {
  const ids = new Set<SecretBadge['id']>();
  if (successCount > 0) ids.add('FIRST_SUCCESS');
  if (successCount >= 5) ids.add('FIVE_SUCCESSES');
  return ids;
}

type FantasyBadgeConcept = { id: string; name: string; art: string; sourceId?: SecretBadge['id'] };

const fantasyBadgeConcepts: readonly FantasyBadgeConcept[] = [
  { id: 'dragon-egg', name: '드래곤 알', art: 'dragon-egg', sourceId: 'FIRST_SUCCESS' },
  { id: 'rainbow-butterfly', name: '무지개 나비', art: 'rainbow-butterfly', sourceId: 'TRY_AGAIN' },
  { id: 'treasure-chest', name: '반짝 보물상자', art: 'treasure-chest', sourceId: 'BRAVE_SUCCESS' },
  { id: 'crystal-palace', name: '수정 궁전', art: 'crystal-palace', sourceId: 'FIVE_SUCCESSES' },
  { id: 'moon-fox', name: '달빛 여우', art: 'moon-fox', sourceId: 'NEW_ACTIVITY' },
  { id: 'starlight-key', name: '별빛 열쇠', art: 'starlight-key', sourceId: 'NEW_PATH' },
  ...['구름 배', '숲의 나침반', '꿈의 등불', '별가루 병', '요정 우체통', '은하 버섯', '바람개비 섬', '달토끼 망토', '해님 왕관', '비밀 지도', '초록 용의 뿔', '노을 보석', '바다 유리병', '구름 성', '반딧불 램프', '마법 씨앗', '눈꽃 종', '황금 나뭇잎', '꿈꾸는 고래', '무지개 망원경', '별사탕 정원', '달 조각 배', '숲 요정의 가방', '보랏빛 나비집', '아침 햇살 구슬', '바람 숲 리본', '작은 혜성', '보물섬 깃발', '빛나는 조개', '구름 여우'].map((name, index) => ({ id: `future-${index + 1}`, name, art: `future-${(index % 6) + 1}` })),
];

function fantasyConceptForBadge(badge: SecretBadge): FantasyBadgeConcept {
  return fantasyBadgeConcepts.find(concept => concept.sourceId === badge.id) ?? fantasyBadgeConcepts[0];
}

function orderedBadgeConcepts(successCount: number): FantasyBadgeConcept[] {
  const earned = earnedIds(successCount);
  const recentRank = new Map<SecretBadge['id'], number>([
    ['FIVE_SUCCESSES', 0],
    ['FIRST_SUCCESS', 1],
  ]);
  return [...fantasyBadgeConcepts].sort((left, right) => {
    const leftBadge = left.sourceId;
    const rightBadge = right.sourceId;
    const leftEarned = Boolean(leftBadge && earned.has(leftBadge));
    const rightEarned = Boolean(rightBadge && earned.has(rightBadge));
    if (leftEarned !== rightEarned) return leftEarned ? -1 : 1;
    if (leftEarned && rightEarned) return (recentRank.get(leftBadge!) ?? 99) - (recentRank.get(rightBadge!) ?? 99);
    return 0;
  });
}

function BadgeVisual({ concept, earned = false }: { concept: FantasyBadgeConcept; earned?: boolean }) {
  const asset = concept.sourceId ? badgeAssetById[concept.sourceId] ?? badgeAssetByConceptId[concept.id] : badgeAssetByConceptId[concept.id];
  return <span className={`lxp-secret__badge-art lxp-secret__badge-art--${concept.art} ${asset ? 'is-image' : 'is-missing'} ${earned ? 'is-earned' : 'is-locked'}`} aria-hidden="true">
    {asset && <img src={asset} alt="" />}
  </span>;
}

function Path({ successCount, roundCount }: Pick<Props, 'successCount' | 'roundCount'>) {
  const points = [
    { number: 1, title: '첫 놀이', detail: roundCount ? '기록이 있어요' : '아직 기록 없음', done: roundCount > 0 },
    { number: 2, title: '성공 한 걸음', detail: successCount ? '성공 기록 1회 이상' : '성공 기록 없음', done: successCount > 0 },
    { number: 3, title: '다섯 걸음', detail: successCount >= 5 ? '성공 5회 기록' : '성공 5회 기준', done: successCount >= 5 },
    { number: 4, title: '새 놀이', detail: '콘텐츠 기록 기준 미정', done: false },
    { number: 5, title: '새 길', detail: '발견 이벤트 미지원', done: false },
  ];
  return <div className="lxp-secret__path-wrap">
    <svg className="lxp-secret__path" viewBox="0 0 620 360" aria-label="다섯 지점으로 이어지는 곡선 모험길" role="img">
      <path className="lxp-secret__path-shadow" d="M78 295 C130 255 120 190 204 188 S306 250 351 190 S413 73 505 92 S538 180 577 135" />
      <path className="lxp-secret__path-line" d="M78 295 C130 255 120 190 204 188 S306 250 351 190 S413 73 505 92 S538 180 577 135" />
    </svg>
    <ol className="lxp-secret__points">
      {points.map(point => <li key={point.number} className={`lxp-secret__point lxp-secret__point--${point.number} ${point.done ? 'is-done' : ''}`}>
        <span className="lxp-secret__marker">{point.done ? '✓' : point.number}</span>
        <span><strong>{point.title}</strong><small>{point.detail}</small></span>
      </li>)}
    </ol>
    <span className="lxp-secret__decor lxp-secret__decor--tree" aria-hidden="true">🌳</span>
    <span className="lxp-secret__decor lxp-secret__decor--hill" aria-hidden="true">⛰️</span>
    <span className="lxp-secret__decor lxp-secret__decor--chest" aria-hidden="true">🧰</span>
  </div>;
}

function LegacyLxpSecretLandDashboard({ successCount, partyCount, roundCount, onBadges, onPlay }: Props) {
  const earned = earnedIds(successCount);
  return <div className="lxp-secret">
    <div className="lxp-secret__top">
      <section className="lxp-secret__placeholder" aria-label="기능 미정 영역"><span aria-hidden="true">✦</span><strong>새로운 공간</strong><small>기능을 준비하고 있어요</small></section>
      <button type="button" className="lxp-secret__badge-button" onClick={onBadges} aria-label="나의 배지함 열기"><span aria-hidden="true">🎒</span><span>나의 배지함</span><b>{earned.size}</b></button>
    </div>
    <section className="lxp-secret__map" aria-labelledby="lxp-secret-title">
      <div className="lxp-secret__heading"><span>피키와 함께 떠나는</span><h2 id="lxp-secret-title">비밀길을 찾아요!</h2><p>내가 해 본 놀이가 모험길에 남아요.</p></div>
      <Path successCount={successCount} roundCount={roundCount} />
      <div className="lxp-secret__piki"><PikiCharacter expression={successCount ? 'successHappy' : 'curious'} size="small" /><span>피키</span></div>
      <button type="button" className="lxp-secret__play" onClick={onPlay}>새 놀이 만나기 <span aria-hidden="true">→</span></button>
    </section>
    <div className="lxp-secret__bottom">
      <section className="lxp-secret__story"><span aria-hidden="true">🌿</span><div><span>조금만 더 노력하면!</span><h2>다음 목표는 아직 정하지 않았어요</h2><p>기록이 충분해지면 다음 경험을 연결해 보여 줄게요.</p></div></section>
      <section className="lxp-secret__story lxp-secret__story--memory"><span aria-hidden="true">📖</span><div><span>그땐 이런 일이 펼쳐져!</span><h2>내 놀이 기억</h2><p>성공 {successCount}회 · 파티 {partyCount}회</p><div className="lxp-secret__earned">{secretBadges.filter(badge => earned.has(badge.id)).map(badge => <span key={badge.id} title={badge.name}>{badge.symbol}</span>)}{earned.size === 0 && <small>아직 연결된 배지가 없어요.</small>}</div></div></section>
    </div>
  </div>;
}

function LegacyLxpBadgeCollection({ successCount, onSelect, onPlay }: { successCount: number; onSelect: (badge: SecretBadge) => void; onPlay: () => void }) {
  const earned = earnedIds(successCount);
  return <div className="lxp-secret__collection"><header><PikiCharacter expression="curious" size="small" /><div><span>피키와 비밀나라</span><h2>나의 배지함</h2><p>놀이 기록과 연결된 배지만 보여줘요.</p></div></header><div className="lxp-secret__badge-grid" role="list" aria-label="배지 도감">{secretBadges.map(badge => { const locked = !earned.has(badge.id); return <button type="button" role="listitem" key={badge.id} disabled={locked} onClick={() => onSelect(badge)}><span className={`lxp-secret__badge lxp-secret__badge--${badge.tone} ${locked ? 'is-locked' : ''}`}>{locked ? '·' : badge.symbol}</span><strong>{locked ? '아직 기록 없음' : badge.name}</strong><small>{badge.condition}</small></button>; })}</div><button type="button" className="lxp-secret__play" onClick={onPlay}>새 놀이 만나기</button></div>;
}
function LegacyLxpSecretLandDashboardV2({ successCount, partyCount, roundCount, onBadges, onPlay }: Props) {
  const earned = earnedIds(successCount);
  const earnedBadges = secretBadges.filter(badge => earned.has(badge.id)).map(fantasyConceptForBadge);
  return <div className="lxp-secret"><div className="lxp-secret__top"><section className="lxp-secret__preview" aria-label="획득한 배지 미리보기"><span>내가 발견한 보물</span><div>{earnedBadges.length ? earnedBadges.slice(0, 5).map(concept => <BadgeVisual key={concept.id} concept={concept} earned />) : <small>아직 발견한 배지가 없어요.</small>}</div></section><button type="button" className="lxp-secret__badge-button" onClick={onBadges} aria-label="나의 배지함 열기"><span aria-hidden="true">🎒</span><span>나의 배지함 열기</span></button></div><section className="lxp-secret__map" aria-labelledby="lxp-secret-title"><div className="lxp-secret__heading"><span>피키와 함께 떠나는</span><h2 id="lxp-secret-title">비밀길을 찾아요!</h2><p>내가 해 본 놀이가 모험길에 남아요.</p></div><Path successCount={successCount} roundCount={roundCount} /><div className="lxp-secret__piki"><PikiCharacter expression={successCount ? 'successHappy' : 'curious'} size="small" /><span>피키</span></div><button type="button" className="lxp-secret__play" onClick={onPlay}>새 놀이 만나기 <span aria-hidden="true">→</span></button></section><div className="lxp-secret__bottom"><section className="lxp-secret__story"><span aria-hidden="true">🌿</span><div><span>조금만 더 노력하면!</span><h2>다음 목표는 아직 정하지 않았어요</h2><p>기록이 충분해지면 다음 경험을 연결해 보여 줄게요.</p></div></section><section className="lxp-secret__story lxp-secret__story--memory"><span aria-hidden="true">📖</span><div><span>그땐 이런 일이 펼쳐져!</span><h2>내 놀이 기억</h2><p>기록과 연결된 배지만 보여줘요.</p><div className="lxp-secret__earned">{earnedBadges.map(concept => <BadgeVisual key={concept.id} concept={concept} earned />)}{!earnedBadges.length && <small>아직 연결된 배지가 없어요.</small>}</div></div></section></div></div>;
}
export function LxpBadgeCollection({ successCount, onSelect, onPlay }: { successCount: number; onSelect: (badge: SecretBadge) => void; onPlay: () => void }) {
  const earned = earnedIds(successCount);
  const sourceById = new Map(secretBadges.map(badge => [badge.id, badge]));
  const ordered = useMemo(() => orderedBadgeConcepts(successCount), [successCount]);
  const [page, setPage] = useState(0);
  const [reaction, setReaction] = useState<'curious' | 'surprised' | 'successHappy'>('curious');
  const previousSuccessCount = useRef(successCount);
  const pageSize = 6;
  const pageCount = Math.ceil(ordered.length / pageSize);
  useEffect(() => { setPage(0); }, [successCount]);
  useEffect(() => {
    const previous = previousSuccessCount.current;
    previousSuccessCount.current = successCount;
    if (successCount <= previous) return;
    setReaction('surprised');
    const timer = window.setTimeout(() => setReaction('successHappy'), 900);
    return () => window.clearTimeout(timer);
  }, [successCount]);
  useEffect(() => {
    const lockedCards = Array.from(document.querySelectorAll<HTMLButtonElement>('.lxp-secret__collection--badge-page .lxp-secret__badge-card.is-locked'));
    const handleLockedCard = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.querySelector('.lxp-secret__badge-notice-backdrop')?.remove();
      const card = event.currentTarget as HTMLElement;
      const backdrop = document.createElement('div');
      backdrop.className = 'secret-detail-backdrop lxp-secret__badge-notice-backdrop';
      const detail = document.createElement('section');
      detail.className = 'secret-detail lxp-secret__badge-detail lxp-secret__badge-notice';
      detail.setAttribute('role', 'dialog');
      detail.setAttribute('aria-modal', 'true');
      detail.setAttribute('aria-label', '\uC544\uC9C1 \uB9CC\uB098\uC9C0 \uC54A\uC558\uC5B4\uC694');
      const art = card.querySelector('.lxp-secret__badge-art')?.cloneNode(true);
      if (art) detail.appendChild(art);
      const message = document.createElement('strong');
      message.textContent = '\uC544\uC9C1 \uB9CC\uB098\uC9C0 \uC54A\uC558\uC5B4\uC694';
      detail.appendChild(message);
      const close = () => backdrop.remove();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary';
      button.textContent = '\uBC30\uC9C0\uD568\uC73C\uB85C';
      button.addEventListener('click', close);
      detail.appendChild(button);
      detail.addEventListener('click', event => event.stopPropagation());
      backdrop.addEventListener('click', close);
      backdrop.appendChild(detail);
      document.body.appendChild(backdrop);
      button.focus();
    };
    lockedCards.forEach(card => {
      card.disabled = false;
      card.addEventListener('click', handleLockedCard, true);
    });
    return () => lockedCards.forEach(card => card.removeEventListener('click', handleLockedCard, true));
  }, [page, successCount]);
  const pageItems = ordered.slice(page * pageSize, (page + 1) * pageSize);
  void onPlay;
  return <div className="lxp-secret__collection lxp-secret__collection--badge-page"><header className="lxp-secret__collection-header"><PikiCharacter expression={reaction} size="small" /><div><span>피키와 비밀나라</span><h2>나의 배지함</h2><p>보물 모양을 눌러 놀이 경험을 살펴봐요.</p></div></header><div className="lxp-secret__badge-grid lxp-secret__badge-grid--fantasy" role="list" aria-label="판타지 배지 도감">{pageItems.map(concept => { const source = concept.sourceId ? sourceById.get(concept.sourceId) : undefined; const unlocked = Boolean(source && earned.has(source.id)); return <button className={`lxp-secret__badge-card ${unlocked ? 'is-earned' : 'is-locked'}`} type="button" role="listitem" key={concept.id} disabled={!unlocked} onClick={() => { if (!source) return; setReaction('curious'); onSelect(source); }} aria-label={unlocked ? `${concept.name}, 놀이 경험 보기` : `${concept.name}, 아직 발견하지 않음`}><BadgeVisual concept={concept} earned={unlocked} /><strong>{concept.name}</strong><small>{unlocked ? '놀이 경험 보기' : source ? '아직 만나지 않았어요' : '새 모험에서 만나요'}</small></button>; })}</div><nav className="lxp-secret__pagination" aria-label="배지 도감 페이지 이동"><button type="button" onClick={() => setPage(current => Math.max(0, current - 1))} disabled={page === 0}>〈 이전</button><span aria-live="polite">{page + 1} / {pageCount}</span><button type="button" onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} disabled={page === pageCount - 1}>다음 〉</button></nav></div>;
}

export function LxpBadgeDetail({ badge, onClose }: { badge: SecretBadge; onClose: () => void }) {
  const concept = fantasyConceptForBadge(badge);
  return <div className="secret-detail-backdrop" role="presentation"><section className="secret-detail lxp-secret__badge-detail" role="dialog" aria-modal="true" aria-labelledby="secret-badge-title"><BadgeVisual concept={concept} earned /><span>피키가 알려 주는 배지 이야기</span><h2 id="secret-badge-title">{concept.name}</h2><p>{badge.description}</p><b>{badge.condition}</b><button type="button" className="primary" onClick={onClose}>배지함으로</button></section></div>;
}
const journeyStops = [
  { x: 78, y: 295, title: '새싹 언덕', scene: 'sprout' },
  { x: 204, y: 188, title: '마법 샘', scene: 'spring' },
  { x: 351, y: 190, title: '무지개 다리', scene: 'bridge' },
  { x: 505, y: 92, title: '구름 성', scene: 'castle' },
  { x: 577, y: 135, title: '별빛 문', scene: 'gate' },
] as const;

function journeyPosition(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const scaled = clamped * (journeyStops.length - 1);
  const index = Math.min(journeyStops.length - 2, Math.floor(scaled));
  const fraction = scaled - index;
  const from = journeyStops[index];
  const to = journeyStops[Math.min(index + 1, journeyStops.length - 1)];
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction, angle: Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI) };
}

function LegacyLivingPath({ successCount, roundCount }: Pick<Props, 'successCount' | 'roundCount'>) {
  const targetStop = successCount >= 5 ? 2 : successCount > 0 ? 1 : roundCount > 0 ? 0 : 0;
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const target = targetStop / (journeyStops.length - 1);
    const start = performance.now();
    const duration = targetStop === 0 ? 1 : 1800;
    let frame = 0;
    const tick = (now: number) => {
      const eased = Math.min(1, (now - start) / duration);
      setProgress(target * (1 - Math.pow(1 - eased, 3)));
      if (eased < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetStop]);
  const position = journeyPosition(progress);
  return <div className="lxp-secret__path-wrap lxp-secret__path-wrap--living">
    <svg className="lxp-secret__path" viewBox="0 0 620 360" role="img" aria-label="새싹 언덕에서 별빛 문까지 이어지는 곡선 모험길">
      <path className="lxp-secret__path-shadow" d="M78 295 C130 255 120 190 204 188 S306 250 351 190 S413 73 505 92 S538 180 577 135" />
      <path className="lxp-secret__path-line" d="M78 295 C130 255 120 190 204 188 S306 250 351 190 S413 73 505 92 S538 180 577 135" />
    </svg>
    <ol className="lxp-secret__living-points">
      {journeyStops.map((stop, index) => { const done = index <= targetStop && (index < targetStop || targetStop > 0); return <li key={stop.title} className={`lxp-secret__living-point lxp-secret__living-point--${index + 1} ${done ? 'is-done' : ''}`}><div className={`lxp-secret__scene lxp-secret__scene--${stop.scene}`} aria-hidden="true"><i /><b /><em /></div><span className="lxp-secret__place-label"><strong>{stop.title}</strong><small>{done ? '발견했어요' : '다음 모험'}</small></span></li>; })}
    </ol>
    <div className="lxp-secret__traveler" data-moving={targetStop > 0 && progress < targetStop / (journeyStops.length - 1)} style={{ left: `${(position.x / 620) * 100}%`, top: `${(position.y / 360) * 100}%`, '--traveler-angle': `${position.angle}deg` } as CSSProperties}><PikiCharacter expression={targetStop > 0 ? 'successHappy' : 'curious'} size="small" /><span>피키</span></div>
  </div>;
}

function PlaceIllustration({ scene }: { scene: (typeof journeyStops)[number]['scene'] }) {
  const gradients = { sprout: 'sprout-gradient', spring: 'spring-gradient', bridge: 'bridge-gradient', castle: 'castle-gradient', gate: 'gate-gradient' } as const;
  const gradient = gradients[scene];
  return <svg className="lxp-secret__place-art" viewBox="0 0 160 120" role="img" aria-label="">
    <defs>
      <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#fff4b0" /><stop offset="1" stopColor="#e6926f" /></linearGradient>
      <linearGradient id={`${gradient}-shadow`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".82" /><stop offset="1" stopColor="#6d657d" stopOpacity=".35" /></linearGradient>
    </defs>
    {scene === 'sprout' && <><path d="M10 94 Q45 62 80 85 T150 78 V112 H10Z" fill="#77b965" /><path d="M18 98 Q58 76 93 95 T150 87" fill="none" stroke="#d7b77b" strokeWidth="9" strokeLinecap="round" /><path d="M46 88 Q49 63 62 48 M50 67 Q34 61 30 48 M57 57 Q69 46 78 34" fill="none" stroke="#4f9557" strokeWidth="5" strokeLinecap="round" /><circle cx="28" cy="89" r="5" fill="#f5b3a9" /><circle cx="92" cy="91" r="5" fill="#fff0a0" /><circle cx="128" cy="81" r="4" fill="#f2a5c4" /><path d="M45 83 q10 -13 18 0 q-10 6 -18 0 M58 63 q10 -12 18 -1 q-8 6 -18 1" fill="#9fce6d" /></>}
    {scene === 'spring' && <><path d="M8 98 Q45 70 83 88 T152 82 V112 H8Z" fill="#a7c3a1" /><ellipse cx="80" cy="78" rx="54" ry="25" fill={`url(#${gradient}-shadow)`} stroke="#678d98" strokeWidth="4" /><ellipse cx="80" cy="75" rx="42" ry="15" fill={`url(#${gradient})`} opacity=".85" /><path d="M37 70 q12 -25 26 0 M97 68 q12 -31 28 0" fill="none" stroke="#8d806f" strokeWidth="8" strokeLinecap="round" /><path d="M80 53 C72 39 88 39 80 24 C96 40 95 50 80 53Z" fill="#a9e9ee" stroke="#5eb4c6" strokeWidth="3" /><circle cx="51" cy="52" r="4" fill="#fff6c1" /><circle cx="118" cy="41" r="3" fill="#fff6c1" /></>}
    {scene === 'bridge' && <><path d="M8 96 Q45 69 78 88 T152 81 V112 H8Z" fill="#9cb5c5" /><path d="M14 101 Q49 77 80 94 T147 87" fill="none" stroke="#647c91" strokeWidth="13" opacity=".7" /><path d="M20 74 Q80 15 140 74" fill="none" stroke="#9b674c" strokeWidth="22" strokeLinecap="round" /><path d="M20 74 Q80 15 140 74" fill="none" stroke="#e7b06e" strokeWidth="13" strokeLinecap="round" /><path d="M25 72 l-5 -21 M48 53 l-2 -21 M80 38 V17 M112 53 l3 -21 M137 72 l7 -20" stroke="#80553f" strokeWidth="4" /><path d="M8 28 Q30 10 52 28 M111 25 Q134 6 155 28" fill="none" stroke="#fff8ef" strokeWidth="11" strokeLinecap="round" /></>}
    {scene === 'castle' && <><path d="M10 102 Q50 73 83 91 T151 83 V112 H10Z" fill="#b9d3ca" /><path d="M38 89 V44 H122 V89Z" fill="#f4c879" stroke="#8d6b68" strokeWidth="4" /><path d="M31 46 L50 18 L69 46Z M92 46 L111 12 L130 46Z" fill="#db8ca0" stroke="#8d6b68" strokeWidth="4" /><path d="M72 89 V58 H88 V89Z" fill="#8c78a8" /><circle cx="80" cy="72" r="5" fill="#fff3a2" /><path d="M111 12 V1 M111 4 l19 7 -19 8" fill="#f08d7c" stroke="#8d6b68" strokeWidth="3" /><path d="M14 32 Q32 13 50 30 M118 31 Q139 10 157 31" fill="none" stroke="#fff8ef" strokeWidth="12" strokeLinecap="round" /></>}
    {scene === 'gate' && <><path d="M10 102 Q54 78 85 94 T151 82" fill="none" stroke="#d3b176" strokeWidth="12" strokeLinecap="round" /><path d="M45 104 V56 Q45 19 80 19 Q115 19 115 56 V104" fill="none" stroke="#f2d069" strokeWidth="12" /><path d="M56 102 V58 Q56 31 80 31 Q104 31 104 58 V102Z" fill="#6d5ca2" stroke="#9d85d3" strokeWidth="4" /><path d="M80 49 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1Z" fill="#fff4a2" /><circle cx="27" cy="31" r="4" fill="#fff4a2" /><circle cx="137" cy="48" r="3" fill="#fff4a2" /><path d="M21 56 l6 6 M133 22 l6 6" stroke="#f8e99b" strokeWidth="3" strokeLinecap="round" /></>}
  </svg>;
}

const unlockStorageKey = 'pikipick.secret-land.unlock.v1';

function readStoredUnlock(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(unlockStorageKey);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= -1 && value <= journeyStops.length - 1 ? value : null;
}

function LegacyLivingPathCamera({ successCount, roundCount }: Pick<Props, 'successCount' | 'roundCount'>) {
  const unlockedTarget = successCount >= 5 ? 2 : successCount > 0 ? 1 : roundCount > 0 ? 0 : -1;
  const initialUnlock = useRef(readStoredUnlock()).current;
  const [visibleTarget, setVisibleTarget] = useState(() => initialUnlock ?? unlockedTarget);
  const [progress, setProgress] = useState(() => Math.max(0, (initialUnlock ?? unlockedTarget) / (journeyStops.length - 1)));
  const [celebration, setCelebration] = useState<string | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (initialUnlock === null && typeof window !== 'undefined') window.localStorage.setItem(unlockStorageKey, String(unlockedTarget));
      return;
    }
    if (unlockedTarget <= visibleTarget) return;
    const from = visibleTarget;
    const to = unlockedTarget;
    setCelebration(`${journeyStops[Math.max(0, to)].title}이(가) 열렸어!`);
    const duration = 1900;
    let frame = 0;
    let clearCelebrationTimer = 0;
    const startMotion = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const ratio = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - ratio, 3);
        setProgress((from + (to - from) * eased) / (journeyStops.length - 1));
        if (ratio < 1) frame = requestAnimationFrame(tick);
        else {
          setVisibleTarget(to);
          if (typeof window !== 'undefined') window.localStorage.setItem(unlockStorageKey, String(to));
          clearCelebrationTimer = window.setTimeout(() => setCelebration(null), 850);
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const celebrationDelay = window.setTimeout(startMotion, 700);
    return () => { window.clearTimeout(celebrationDelay); window.clearTimeout(clearCelebrationTimer); cancelAnimationFrame(frame); };
  }, [initialUnlock, unlockedTarget, visibleTarget]);

  const position = journeyPosition(progress);
  return <div className="lxp-secret__path-wrap lxp-secret__path-wrap--living">
    <svg className="lxp-secret__path" viewBox="0 0 620 360" role="img" aria-label="장소를 잇는 곡선 모험길"><path className="lxp-secret__path-shadow" d="M78 295 C130 255 120 190 204 188 S306 250 351 190 S413 73 505 92 S538 180 577 135" /><path className="lxp-secret__path-line" d="M78 295 C130 255 120 190 204 188 S306 250 351 190 S413 73 505 92 S538 180 577 135" /></svg>
    <ol className="lxp-secret__living-points">{journeyStops.map((stop, index) => { const unlocked = index <= visibleTarget; const arrived = index < visibleTarget || (index === visibleTarget && unlockedTarget === visibleTarget); return <li key={stop.title} className={`lxp-secret__living-point lxp-secret__living-point--${index + 1} ${unlocked ? 'is-unlocked' : 'is-locked'} ${arrived ? 'is-arrived' : ''}`}><div className={`lxp-secret__scene lxp-secret__scene--${stop.scene}`}><PlaceIllustration scene={stop.scene} /></div><span className="lxp-secret__place-label"><strong>{stop.title}</strong></span></li>; })}</ol>
    <div className="lxp-secret__traveler" data-moving={unlockedTarget > visibleTarget} style={{ left: `${(position.x / 620) * 100}%`, top: `${(position.y / 360) * 100}%`, '--traveler-angle': `${position.angle}deg` } as CSSProperties}><PikiCharacter expression={unlockedTarget > visibleTarget ? 'successHappy' : 'curious'} size="small" /><span>피키</span></div>
    {celebration && <div className="lxp-secret__unlock-celebration" role="status" aria-live="polite"><strong>{celebration}</strong><span>새로운 모험이 기다려!</span></div>}
  </div>;
}

const longWorldWidth = 2400;
const longViewportWidth = 620;
const longJourneyStops = journeyStops.map((stop, index) => ({
  ...stop,
  x: [170, 690, 1220, 1770, 2260][index],
  y: [264, 188, 245, 94, 145][index],
}));

const longJourneyControls = [
  { c1: { x: 330, y: 255 }, c2: { x: 430, y: 156 } },
  { c1: { x: 820, y: 158 }, c2: { x: 1010, y: 330 } },
  { c1: { x: 1370, y: 175 }, c2: { x: 1460, y: 54 } },
  { c1: { x: 1900, y: 40 }, c2: { x: 2070, y: 235 } },
] as const;

function longJourneyPosition(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const scaled = clamped * (longJourneyStops.length - 1);
  const index = Math.min(longJourneyStops.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const from = longJourneyStops[index];
  const to = longJourneyStops[index + 1];
  const controls = longJourneyControls[index];
  const eased = t * t * (3 - 2 * t);
  const one = 1 - eased;
  return {
    x: one ** 3 * from.x + 3 * one ** 2 * eased * controls.c1.x + 3 * one * eased ** 2 * controls.c2.x + eased ** 3 * to.x,
    y: one ** 3 * from.y + 3 * one ** 2 * eased * controls.c1.y + 3 * one * eased ** 2 * controls.c2.y + eased ** 3 * to.y,
    angle: Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI),
  };
}

function LongWorldDecor() {
  return <svg className="lxp-secret__world-decor" viewBox={`0 0 ${longWorldWidth} 360`} preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="world-hill" x1="0" x2="1"><stop offset="0" stopColor="#a9ce88" /><stop offset="1" stopColor="#79ae7e" /></linearGradient><linearGradient id="world-water" x1="0" x2="1"><stop offset="0" stopColor="#9de4e5" /><stop offset="1" stopColor="#5eb7ca" /></linearGradient></defs>
    <path d="M0 130 Q160 80 310 135 T640 124 Q770 60 930 125 T1240 124 Q1380 82 1530 134 T1830 115 Q1990 55 2160 128 T2400 105 V360 H0Z" fill="url(#world-hill)" opacity=".72" />
    <path d="M0 308 Q260 262 520 320 T980 302 Q1210 250 1450 315 T1900 288 Q2150 248 2400 300" fill="none" stroke="url(#world-water)" strokeWidth="16" opacity=".52" />
    <g fill="#5e9d64" stroke="#427951" strokeWidth="4"><path d="M90 212 l24 -70 24 70Z" /><path d="M470 140 l27 -82 27 82Z" /><path d="M900 250 l31 -92 31 92Z" /><path d="M1490 145 l27 -84 27 84Z" /><path d="M2040 235 l29 -88 29 88Z" /></g>
    <g fill="#f7c5b7" stroke="#d28d83" strokeWidth="3"><circle cx="270" cy="265" r="9" /><circle cx="289" cy="253" r="7" /><circle cx="1080" cy="114" r="8" /><circle cx="1098" cy="104" r="6" /><circle cx="1930" cy="270" r="9" /><circle cx="1950" cy="258" r="6" /></g>
    <g fill="#f4df91" stroke="#b99d58" strokeWidth="3"><path d="M350 312 l22 -28 22 28Z" /><path d="M1300 300 l26 -32 26 32Z" /><path d="M2180 300 l24 -31 24 31Z" /></g>
  </svg>;
}

function LegacyInteractiveLivingPath({ successCount, roundCount }: Pick<Props, 'successCount' | 'roundCount'>) {
  const unlockedTarget = successCount >= 5 ? 2 : successCount > 0 ? 1 : roundCount > 0 ? 0 : -1;
  const initialUnlock = useRef(readStoredUnlock()).current;
  const [visibleTarget, setVisibleTarget] = useState(() => initialUnlock ?? unlockedTarget);
  const [progress, setProgress] = useState(() => Math.max(0, (initialUnlock ?? unlockedTarget) / (longJourneyStops.length - 1)));
  const [celebration, setCelebration] = useState<string | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (initialUnlock === null && typeof window !== 'undefined') window.localStorage.setItem(unlockStorageKey, String(unlockedTarget));
      return;
    }
    if (unlockedTarget <= visibleTarget) return;
    const from = visibleTarget;
    const to = unlockedTarget;
    setCelebration(`${longJourneyStops[Math.max(0, to)].title}이(가) 열렸어!`);
    let frame = 0;
    let clearCelebrationTimer = 0;
    const startMotion = () => {
      const start = performance.now();
      const duration = 1900 + (to - from) * 450;
      const tick = (now: number) => {
        const ratio = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - ratio, 3);
        setProgress((from + (to - from) * eased) / (longJourneyStops.length - 1));
        if (ratio < 1) frame = requestAnimationFrame(tick);
        else {
          setVisibleTarget(to);
          if (typeof window !== 'undefined') window.localStorage.setItem(unlockStorageKey, String(to));
          clearCelebrationTimer = window.setTimeout(() => setCelebration(null), 850);
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const celebrationDelay = window.setTimeout(startMotion, 700);
    return () => { window.clearTimeout(celebrationDelay); window.clearTimeout(clearCelebrationTimer); cancelAnimationFrame(frame); };
  }, [initialUnlock, unlockedTarget, visibleTarget]);

  const position = longJourneyPosition(progress);
  const cameraX = Math.max(0, Math.min(longWorldWidth - longViewportWidth, position.x - longViewportWidth / 2));
  const worldStyle = { width: `${(longWorldWidth / longViewportWidth) * 100}%`, transform: `translate3d(-${(cameraX / longWorldWidth) * 100}%, 0, 0)` };
  return <div className="lxp-secret__path-wrap lxp-secret__path-wrap--living lxp-secret__viewport">
    <div className="lxp-secret__world" style={worldStyle}>
      <img className="lxp-secret__world-art" src={secretLandAssets.world} alt="" aria-hidden="true" />
      <LongWorldDecor />
      <svg className="lxp-secret__path" viewBox={`0 0 ${longWorldWidth} 360`} role="img" aria-label="피키가 따라가는 긴 곡선 모험길"><path className="lxp-secret__path-shadow" d="M170 264 C330 255 430 156 690 188 S1010 330 1220 245 S1460 54 1770 94 S2070 235 2260 145" /><path className="lxp-secret__path-line" d="M170 264 C330 255 430 156 690 188 S1010 330 1220 245 S1460 54 1770 94 S2070 235 2260 145" /></svg>
      <ol className="lxp-secret__living-points">{longJourneyStops.map((stop, index) => { const unlocked = index <= visibleTarget; const arrived = index < visibleTarget || (index === visibleTarget && unlockedTarget === visibleTarget); return <li key={stop.title} className={`lxp-secret__living-point lxp-secret__living-point--${index + 1} ${unlocked ? 'is-unlocked' : 'is-locked'} ${arrived ? 'is-arrived' : ''}`} style={{ left: `${(stop.x / longWorldWidth) * 100}%`, top: `${(stop.y / 360) * 100}%` }}><div className={`lxp-secret__scene lxp-secret__scene--${stop.scene}`}><PlaceIllustration scene={stop.scene} /></div><span className="lxp-secret__place-label"><strong>{stop.title}</strong></span></li>; })}</ol>
      <div className="lxp-secret__traveler" data-moving={unlockedTarget > visibleTarget} style={{ left: `${(position.x / longWorldWidth) * 100}%`, top: `${(position.y / 360) * 100}%`, '--traveler-angle': `${position.angle}deg` } as CSSProperties}><PikiCharacter expression={unlockedTarget > visibleTarget ? 'successHappy' : 'curious'} size="small" /><span>피키</span></div>
    </div>
    {celebration && <div className="lxp-secret__unlock-celebration" role="status" aria-live="polite"><strong>{celebration}</strong><span>새로운 모험이 기다려!</span></div>}
  </div>;
}

/**
 * Canonical geometry for the active adventure map. Every coordinate is in the
 * same 2400 × 800 world as the background artwork; `pathAnchor` is the point
 * where Piki's feet stand, not the centre of the landmark illustration.
 */
// The camera shows a bounded slice of the continuous 9000 x 900 world so
// bridge approaches, exits, and neighboring exploration zones remain readable.
const adventureWorld = { width: 9000, height: 900, viewportWidth: 900, viewportHeight: 420 } as const;
const explorerFrames = {
  idle: {
    src: explorerPikiIdle,
    width: 1312,
    height: 1199,
    // Measured from the supplied standing PNG: the lowest opaque boot pixel
    // is at y=1191; x=668 is the midpoint of the two boot contact areas.
    footAnchor: { x: 668 / 1312, y: 1191 / 1199 },
    visualWidth: 116,
    alt: '정면으로 서 있는 피키',
  },
  left: {
    src: explorerPikiRunLeft,
    width: 1254,
    height: 1254,
    // Measured on the largest opaque character component in the supplied
    // source (lowest visible boot sole around x=360.5, y=1184).
    footAnchor: { x: 360.5 / 1254, y: 1184 / 1254 },
    visualWidth: 108,
    alt: '왼쪽으로 달리는 피키',
  },
  right: {
    src: explorerPikiRunRight,
    width: 1254,
    height: 1254,
    // Measured on the largest opaque character component in the supplied
    // source (lowest visible boot sole around x=864.5, y=1207).
    footAnchor: { x: 864.5 / 1254, y: 1207 / 1254 },
    visualWidth: 106,
    alt: '오른쪽으로 달리는 피키',
  },
} as const;
const explorerWalkFrames = {
  left: [
    { src: explorerPikiWalkLeft01, footAnchor: { x: 487 / 1254, y: 1198 / 1254 } },
    { src: explorerPikiWalkLeft02, footAnchor: { x: 438 / 1254, y: 1198 / 1254 } },
    { src: explorerPikiWalkLeft03, footAnchor: { x: 413 / 1254, y: 1198 / 1254 } },
    { src: explorerPikiWalkLeft04, footAnchor: { x: 684 / 1254, y: 1198 / 1254 } },
  ],
  right: [
    { src: explorerPikiWalkRight01, footAnchor: { x: 778 / 1254, y: 1198 / 1254 } },
    { src: explorerPikiWalkRight02, footAnchor: { x: 685 / 1254, y: 1198 / 1254 } },
    { src: explorerPikiWalkRight03, footAnchor: { x: 789 / 1254, y: 1198 / 1254 } },
    { src: explorerPikiWalkRight04, footAnchor: { x: 498 / 1254, y: 1198 / 1254 } },
  ],
} as const;
const ADVENTURE_WALK_FRAME_DISTANCE = 20;
// The prepared walk sheets share a centered 1254px canvas, but their
// supporting boot changes x-position from frame to frame. Using that boot as
// the sprite's horizontal render origin makes the whole body jump at frame
// boundaries. Keep the measured foot anchor for diagnostics/vertical contact,
// while placing the walking sprite from the common canvas center.
const explorerWalkRenderAnchor = { x: 627 / 1254, y: 1198 / 1254 } as const;
const adventureStops = journeyStops.map((stop, index) => ({
  ...stop,
  landmark: [
    // Vertical placement uses each PNG's measured strong-alpha base so the
    // illustration's visible ground meets the existing pathAnchor.
    { x: 600, y: 571 },
    { x: 2450, y: 486 },
    { x: 4400, y: 315 },
    { x: 6400, y: 497 },
    { x: 8000, y: 458 },
  ][index],
  pathAnchor: [
    { x: 600, y: 680 },
    { x: 2450, y: 610 },
    { x: 4450, y: 410 },
    { x: 6300, y: 610 },
    { x: 7900, y: 590 },
  ][index],
  labelOffset: [
    { x: 0, y: 88 },
    { x: 0, y: 108 },
    { x: 0, y: 96 },
    { x: 0, y: 106 },
    { x: 0, y: 104 },
  ][index],
  sceneBounds: [
    { width: 360, height: 250 },
    { width: 380, height: 260 },
    { width: 460, height: 260 },
    { width: 400, height: 270 },
    { width: 380, height: 270 },
  ][index],
  routeNode: [1, 7, 14, 20, 25][index],
}));

const adventureRoute = [
  { x: 250, y: 680 },
  { x: 600, y: 680 },
  { x: 900, y: 710 },
  { x: 1250, y: 660 },
  { x: 1600, y: 620 },
  { x: 1950, y: 640 },
  { x: 2300, y: 600 },
  { x: 2450, y: 610 },
  { x: 2750, y: 635 },
  { x: 3100, y: 690 },
  { x: 3450, y: 625 },
  { x: 3800, y: 570 },
  // These nodes define the independent code-based rainbow bridge section in
  // the continuous world. The protected raster bridge reference is not used
  // as a runtime background.
  { x: 4030, y: 510 },
  { x: 4150, y: 470 },
  { x: 4400, y: 410 },
  { x: 4520, y: 440 },
  { x: 4640, y: 470 },
  { x: 4800, y: 485 },
  { x: 5080, y: 510 },
  { x: 5315, y: 445 },
  { x: 6300, y: 610 },
  { x: 6650, y: 580 },
  { x: 7000, y: 620 },
  { x: 7350, y: 640 },
  { x: 7600, y: 600 },
  { x: 7900, y: 590 },
  { x: 8200, y: 600 },
] as const;

function adventureRoutePath(startIndex = 0, endIndex = adventureRoute.length - 1) {
  const start = Math.max(0, Math.min(adventureRoute.length - 2, startIndex));
  const end = Math.max(start + 1, Math.min(adventureRoute.length - 1, endIndex));
  let path = `M ${adventureRoute[start].x} ${adventureRoute[start].y}`;
  for (let index = start; index < end; index += 1) {
    const p0 = adventureRoute[Math.max(start, index - 1)];
    const p1 = adventureRoute[index];
    const p2 = adventureRoute[index + 1];
    const p3 = adventureRoute[Math.min(end, index + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    path += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

function WorldTerrainLayer({ unlockedTarget }: { unlockedTarget: number }) {
  // The place set is the higher-fidelity transparent 2.5D artwork already
  // shipped with the project. Keep the world-design candidates available as
  // references, but do not use them as the final runtime landmark treatment.
  const landmarkAssets = secretLandAssets.destinations;
  const bridgePath = adventureRoutePath(9, 19);
  const springEnvironmentActive = unlockedTarget >= 1;
  const castleEnvironmentActive = unlockedTarget >= 3;
  const gateEnvironmentActive = unlockedTarget >= 4;
  const environmentBackedScenes = new Set<string>(['sprout', 'bridge']);
  if (springEnvironmentActive) environmentBackedScenes.add('spring');
  if (castleEnvironmentActive) environmentBackedScenes.add('castle');
  if (gateEnvironmentActive) environmentBackedScenes.add('gate');
  const visualPathSegments = [
    !springEnvironmentActive ? { key: 'spring-fallback', d: adventureRoutePath(6, 10) } : null,
    { key: 'bridge-exit', d: adventureRoutePath(18, 19) },
    castleEnvironmentActive
      ? { key: 'castle-entry', d: adventureRoutePath(19, 20) }
      : { key: 'right-fallback', d: adventureRoutePath(19, adventureRoute.length - 1) },
    castleEnvironmentActive && !gateEnvironmentActive
      ? { key: 'castle-gate-fallback', d: adventureRoutePath(23, adventureRoute.length - 1) }
      : null,
  ].filter((segment): segment is { key: string; d: string } => segment !== null);
  return <div className="lxp-secret__terrain-layer" aria-hidden="true">
    <svg className="lxp-secret__world-background" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="secret-world-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9ddf1" />
          <stop offset="0.58" stopColor="#d7edf0" />
          <stop offset="1" stopColor="#cce3b4" />
        </linearGradient>
        <linearGradient id="secret-world-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8df98" />
          <stop offset="1" stopColor="#79b878" />
        </linearGradient>
        <linearGradient id="secret-world-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8ed8de" />
          <stop offset="0.5" stopColor="#48b6d0" />
          <stop offset="1" stopColor="#7bd2dc" />
        </linearGradient>
        <pattern id="secret-grass-texture" width="220" height="150" patternUnits="userSpaceOnUse">
          <path d="M18 126 Q28 98 38 126 M52 138 Q64 102 76 138 M126 116 Q138 82 150 116 M178 142 Q190 106 202 142" fill="none" stroke="#5f9f65" strokeWidth="7" strokeLinecap="round" opacity=".34" />
          <path d="M8 64 Q54 42 96 62 T188 58 M34 92 Q74 72 116 92 T214 86" fill="none" stroke="#d4ee9a" strokeWidth="5" strokeLinecap="round" opacity=".3" />
          <path d="M104 30 l12 -13 l10 16 l12 -9 l8 16" fill="none" stroke="#f4e7a5" strokeWidth="4" strokeLinecap="round" opacity=".3" />
        </pattern>
        <filter id="secret-ground-grain" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="17" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 .56 0 0 0 0 .72 0 0 0 0 .40 0 0 0 .16 0" result="coloredGrain" />
          <feBlend in="SourceGraphic" in2="coloredGrain" mode="soft-light" />
        </filter>
      </defs>
      <rect width={adventureWorld.width} height={adventureWorld.height} fill="url(#secret-world-sky)" />
      <path className="lxp-secret__world-distant-hills" d="M0 358 Q420 246 900 350 T1800 332 Q2240 205 2780 336 T3800 322 Q4300 210 4800 338 T5800 310 Q6350 190 6900 330 T8000 300 Q8500 220 9000 318 V590 H0Z" />
      <path className="lxp-secret__world-near-hills" d="M0 470 Q520 345 1060 458 T2140 440 Q2640 330 3240 456 T4400 430 Q4940 320 5520 448 T6700 420 Q7300 315 7900 442 T9000 410 V660 H0Z" />
      <path className="lxp-secret__world-ground" d="M0 520 Q560 470 1120 536 T2200 520 Q2760 458 3300 530 T4480 510 Q5000 455 5580 524 T6720 508 Q7300 450 7880 520 T9000 500 V900 H0Z" fill="url(#secret-world-ground)" filter="url(#secret-ground-grain)" />
      <path className="lxp-secret__world-ground-texture" d="M0 520 Q560 470 1120 536 T2200 520 Q2760 458 3300 530 T4480 510 Q5000 455 5580 524 T6720 508 Q7300 450 7880 520 T9000 500 V900 H0Z" fill="url(#secret-grass-texture)" />
      <path className="lxp-secret__world-ground-edge" d="M0 520 Q560 470 1120 536 T2200 520 Q2760 458 3300 530 T4480 510 Q5000 455 5580 524 T6720 508 Q7300 450 7880 520 T9000 500" />
      <path className="lxp-secret__world-river-bank" d="M1460 792 C1960 680 2440 760 2940 735 S3920 810 4460 700 S5420 640 5920 730 S6900 790 7560 660" />
      <path className="lxp-secret__world-river" d="M1460 792 C1960 680 2440 760 2940 735 S3920 810 4460 700 S5420 640 5920 730 S6900 790 7560 660" />
      <path className="lxp-secret__world-river-glint" d="M1700 765 C2200 690 2600 760 3060 735 S3970 785 4460 720 S5400 665 5860 745 S6810 765 7420 680" />
      <path className="lxp-secret__world-river-reflection" d="M1860 744 C2100 700 2320 744 2550 724 M3220 760 C3450 720 3670 770 3910 742 M4720 700 C4950 672 5190 716 5420 688 M6120 736 C6360 704 6620 748 6850 704" />
      <path className="lxp-secret__world-bank-detail" d="M1780 835 C2250 745 2640 810 3060 790 M4860 765 C5260 700 5660 745 6100 790 M6730 760 C7010 720 7280 700 7480 680" />
    </svg>
    <svg className="lxp-secret__world-bridge is-covered-by-environment" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none">
      <defs>
        <pattern id="secret-bridge-stone" width="96" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="96" height="72" fill="#b69472" />
          <path d="M0 9 H96 M0 43 H96 M24 0 V9 M70 9 V43 M42 43 V72" fill="none" stroke="#8f7057" strokeWidth="5" opacity=".52" />
          <path d="M4 17 H28 M52 52 H84" fill="none" stroke="#edd0a2" strokeWidth="4" strokeLinecap="round" opacity=".65" />
        </pattern>
      </defs>
      <path className="lxp-secret__bridge-rainbow lxp-secret__bridge-rainbow--red" d="M3160 662 Q4260 156 5350 456" />
      <path className="lxp-secret__bridge-rainbow lxp-secret__bridge-rainbow--gold" d="M3160 662 Q4260 156 5350 456" />
      <path className="lxp-secret__bridge-rainbow lxp-secret__bridge-rainbow--green" d="M3160 662 Q4260 156 5350 456" />
      <path className="lxp-secret__bridge-rainbow lxp-secret__bridge-rainbow--blue" d="M3160 662 Q4260 156 5350 456" />
      <path className="lxp-secret__bridge-rainbow lxp-secret__bridge-rainbow--violet" d="M3160 662 Q4260 156 5350 456" />
      <path className="lxp-secret__bridge-deck-shadow" d={bridgePath} />
      <path className="lxp-secret__bridge-deck" d={bridgePath} />
      <path className="lxp-secret__bridge-deck-surface" d={bridgePath} />
      <path className="lxp-secret__bridge-deck-highlight" d={bridgePath} />
      <g className="lxp-secret__bridge-low-decor">
        <circle cx="3160" cy="662" r="54" />
        <circle cx="5350" cy="456" r="46" />
        <path d="M3110 691 Q3160 655 3210 691" />
        <path d="M5308 480 Q5350 450 5392 480" />
      </g>
    </svg>
    <svg className="lxp-secret__world-transition-forest" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none">
      <g className="lxp-secret__transition-canopy lxp-secret__transition-canopy--left">
        <path d="M2600 0 H3410 V210 Q3260 250 3110 190 T2800 220 Q2670 190 2600 230Z" />
        <circle cx="2740" cy="126" r="168" /><circle cx="2980" cy="94" r="214" /><circle cx="3250" cy="130" r="176" />
        <path d="M2830 220 Q2910 260 2980 320 M3260 184 Q3310 240 3370 286" />
      </g>
      <g className="lxp-secret__transition-canopy lxp-secret__transition-canopy--right">
        <path d="M5050 0 H5880 V220 Q5700 180 5550 230 T5240 190 Q5120 225 5050 190Z" />
        <circle cx="5200" cy="128" r="180" /><circle cx="5480" cy="88" r="218" /><circle cx="5750" cy="138" r="160" />
        <path d="M5270 205 Q5200 260 5160 312 M5660 186 Q5730 244 5800 286" />
      </g>
      <g className="lxp-secret__transition-understory">
        <path className="lxp-secret__transition-understory--left" d="M2460 900 Q2580 760 2740 820 T3000 780 Q3150 740 3290 820 T3500 790 V900Z" />
        <path className="lxp-secret__transition-understory--right" d="M4980 900 Q5120 780 5280 830 T5550 770 Q5710 735 5860 820 T6030 790 V900Z" />
        <circle cx="2780" cy="806" r="42" /><circle cx="3090" cy="820" r="34" /><circle cx="5350" cy="810" r="38" /><circle cx="5750" cy="800" r="46" />
      </g>
    </svg>
    <svg className="lxp-secret__world-grounding" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none">
      {adventureStops.map((stop) => {
        if (stop.scene === 'bridge') return null;
        const shadowWidth = stop.sceneBounds.width * .38;
        if (environmentBackedScenes.has(stop.scene)) return null;
        return <g key={`${stop.scene}-grounding`} className="lxp-secret__landmark-grounding">
          <ellipse className="lxp-secret__landmark-shadow" cx={stop.pathAnchor.x} cy={stop.pathAnchor.y + 22} rx={shadowWidth} ry="26" />
          <path className="lxp-secret__landmark-grass-rim" d={`M ${stop.pathAnchor.x - shadowWidth} ${stop.pathAnchor.y + 18} Q ${stop.pathAnchor.x - shadowWidth * .55} ${stop.pathAnchor.y - 12}, ${stop.pathAnchor.x} ${stop.pathAnchor.y + 8} T ${stop.pathAnchor.x + shadowWidth} ${stop.pathAnchor.y + 18}`} />
        </g>;
      })}
    </svg>
    {Object.values(secretLandAssets.environment).map((asset) => {
      if ('minUnlockedTarget' in asset && unlockedTarget < asset.minUnlockedTarget) return null;
      return <img
        key={asset.assetId}
        className="lxp-secret__world-environment"
        src={asset.src}
        alt=""
        aria-hidden="true"
        data-asset-id={asset.assetId}
        data-zone-id={asset.zoneId}
        style={{
          left: `${(asset.worldX / adventureWorld.width) * 100}%`,
          top: `${(asset.worldY / adventureWorld.height) * 100}%`,
          width: `${(asset.width / adventureWorld.width) * 100}%`,
          height: `${(asset.height / adventureWorld.height) * 100}%`,
          zIndex: asset.zIndex,
        }}
      />;
    })}
    {adventureStops.map((stop, index) => {
      if (stop.scene === 'bridge') return null;
      if (environmentBackedScenes.has(stop.scene)) return null;
      const asset = landmarkAssets[stop.scene];
      const style = {
        left: `${(stop.landmark.x / adventureWorld.width) * 100}%`,
        top: `${(stop.landmark.y / adventureWorld.height) * 100}%`,
        width: `${(stop.sceneBounds.width / adventureWorld.width) * 100}%`,
        height: `${(stop.sceneBounds.height / adventureWorld.height) * 100}%`,
      };
      return <img key={stop.scene} className={`lxp-secret__terrain-landmark ${index <= unlockedTarget ? 'is-unlocked' : 'is-locked'}`} src={asset} style={style} alt="" />;
    })}
    <svg className="lxp-secret__terrain-path" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none">
      <defs>
        <pattern id="secret-dirt-surface" width="180" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
          <rect width="180" height="120" fill="#c9945d" />
          <path d="M-20 30 Q22 8 64 30 T150 28 T214 26 M-18 82 Q26 58 70 82 T158 78 T216 80" fill="none" stroke="#e2b274" strokeWidth="11" strokeLinecap="round" opacity=".72" />
          <path d="M16 55 Q42 39 66 55 T116 54 M94 108 Q126 90 162 106" fill="none" stroke="#a96f4e" strokeWidth="7" strokeLinecap="round" opacity=".58" />
          <path d="M30 18 l18 -5 l12 8 M132 70 l24 -6 l10 8" fill="none" stroke="#f1c991" strokeWidth="5" strokeLinecap="round" opacity=".64" />
        </pattern>
        <linearGradient id="secret-dirt-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a513f" />
          <stop offset=".42" stopColor="#a9704e" />
          <stop offset="1" stopColor="#744c3d" />
        </linearGradient>
      </defs>
      {visualPathSegments.map((segment) => <g key={segment.key} data-visual-path-segment={segment.key}>
        <path className="lxp-secret__terrain-path-shadow" d={segment.d} />
        <path className="lxp-secret__terrain-path-edge" d={segment.d} />
        <path className="lxp-secret__terrain-path-line" d={segment.d} />
        <path className="lxp-secret__terrain-path-surface" d={segment.d} />
        <path className="lxp-secret__terrain-path-grit" d={segment.d} />
        <path className="lxp-secret__terrain-path-center" d={segment.d} />
      </g>)}
    </svg>
  </div>;
}

function adventurePosition(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const scaledStops = clamped * (adventureStops.length - 1);
  const stopIndex = Math.min(adventureStops.length - 2, Math.floor(scaledStops));
  const localStopProgress = scaledStops - stopIndex;
  const startNode = adventureStops[stopIndex].routeNode;
  const endNode = adventureStops[stopIndex + 1].routeNode;
  const routeProgress = startNode + (endNode - startNode) * localStopProgress;
  const routeIndex = Math.min(adventureRoute.length - 2, Math.floor(routeProgress));
  const t = routeProgress - routeIndex;
  const p0 = adventureRoute[Math.max(0, routeIndex - 1)];
  const from = adventureRoute[routeIndex];
  const to = adventureRoute[routeIndex + 1];
  const p3 = adventureRoute[Math.min(adventureRoute.length - 1, routeIndex + 2)];
  const t2 = t * t;
  const t3 = t2 * t;
  const x = 0.5 * ((2 * from.x) + (-p0.x + to.x) * t + (2 * p0.x - 5 * from.x + 4 * to.x - p3.x) * t2 + (-p0.x + 3 * from.x - 3 * to.x + p3.x) * t3);
  const y = 0.5 * ((2 * from.y) + (-p0.y + to.y) * t + (2 * p0.y - 5 * from.y + 4 * to.y - p3.y) * t2 + (-p0.y + 3 * from.y - 3 * to.y + p3.y) * t3);
  const dx = 0.5 * ((-p0.x + to.x) + 2 * (2 * p0.x - 5 * from.x + 4 * to.x - p3.x) * t + 3 * (-p0.x + 3 * from.x - 3 * to.x + p3.x) * t2);
  const dy = 0.5 * ((-p0.y + to.y) + 2 * (2 * p0.y - 5 * from.y + 4 * to.y - p3.y) * t + 3 * (-p0.y + 3 * from.y - 3 * to.y + p3.y) * t2);
  return {
    x,
    y,
    angle: Math.atan2(dy || to.y - from.y, dx || to.x - from.x) * (180 / Math.PI),
  };
}

const ADVENTURE_WALK_SPEED = 100;

function adventureDistanceBetween(fromProgress: number, toProgress: number): number {
  const start = Math.max(0, Math.min(1, Math.min(fromProgress, toProgress)));
  const end = Math.max(0, Math.min(1, Math.max(fromProgress, toProgress)));
  if (end <= start) return 0;
  const sampleCount = Math.max(12, Math.ceil((end - start) * 240));
  let distance = 0;
  let previous = adventurePosition(start);
  for (let index = 1; index <= sampleCount; index += 1) {
    const point = adventurePosition(start + ((end - start) * index) / sampleCount);
    distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return distance;
}

function progressDeltaForDistance(progress: number, distance: number): number {
  if (distance <= 0) return 0;
  const sampleRadius = 0.001;
  const start = Math.max(0, progress - sampleRadius);
  const end = Math.min(1, progress + sampleRadius);
  const progressSpan = end - start;
  if (progressSpan <= 0) return 0;
  const worldDistance = adventureDistanceBetween(start, end);
  return worldDistance > 0 ? (distance * progressSpan) / worldDistance : 0;
}

const positionStorageKey = 'pikipick.secret-land.position.v1';

function nearestAdventureProgress(worldX: number, worldY: number): number {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index <= 240; index += 1) {
    const progress = index / 240;
    const point = adventurePosition(progress);
    const distance = (point.x - worldX) ** 2 + (point.y - worldY) ** 2;
    if (distance < nearestDistance) {
      nearest = progress;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function isFootDebugEnabled() {
  return import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'feet';
}

function isTerrainDebugEnabled() {
  return import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'terrain';
}

function readFootDebugProgress() {
  if ((!isFootDebugEnabled() && !isTerrainDebugEnabled()) || typeof window === 'undefined') return null;
  const value = Number(new URLSearchParams(window.location.search).get('progress'));
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
}

function LivingPath({ successCount, roundCount }: Pick<Props, 'successCount' | 'roundCount'>) {
  const dataUnlockedTarget = successCount >= 5 ? 2 : successCount > 0 ? 1 : roundCount > 0 ? 0 : -1;
  const initialUnlock = useRef(readStoredUnlock()).current;
  // The stored value preserves an already unlocked place when the app is
  // re-entered. The current game data remains the source for any newer unlock.
  const unlockedTarget = Math.max(dataUnlockedTarget, initialUnlock ?? -1);
  const initialStop = Math.max(0, unlockedTarget);
  const initialProgress = initialStop / (adventureStops.length - 1);
  const [currentStop, setCurrentStop] = useState(initialStop);
  const [desiredProgress, setDesiredProgress] = useState<number | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [heldDirection, setHeldDirection] = useState<-1 | 1 | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [lockNotice, setLockNotice] = useState<number | null>(null);
  const [arrivalStop, setArrivalStop] = useState<number | null>(null);
  const [jumpKey, setJumpKey] = useState(0);
  const hasMounted = useRef(false);
  const progressRef = useRef(progress);
  const motionTokenRef = useRef(0);
  const motionFrameRef = useRef(0);
  const motionDelayRef = useRef<number | null>(null);

  const updateProgress = (next: number) => {
    progressRef.current = next;
    setProgress(next);
  };

  const cancelAutomaticMotion = () => {
    motionTokenRef.current += 1;
    if (motionDelayRef.current !== null) {
      window.clearTimeout(motionDelayRef.current);
      motionDelayRef.current = null;
    }
    if (motionFrameRef.current !== 0) {
      window.cancelAnimationFrame(motionFrameRef.current);
      motionFrameRef.current = 0;
    }
  };

  useEffect(() => {
    progressRef.current = progress;
    if (typeof window !== 'undefined') window.localStorage.setItem(positionStorageKey, String(progress));
  }, [progress]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (initialUnlock === null && typeof window !== 'undefined') window.localStorage.setItem(unlockStorageKey, String(unlockedTarget));
      return;
    }
    if (unlockedTarget <= currentStop) return;
    setDesiredProgress(unlockedTarget / (adventureStops.length - 1));
    setCelebration(`${adventureStops[Math.max(0, unlockedTarget)].title}이(가) 열렸어!`);
  }, [currentStop, initialUnlock, unlockedTarget]);

  useEffect(() => {
    if (desiredProgress === null) return;
    const motionToken = ++motionTokenRef.current;
    const from = progressRef.current;
    const to = desiredProgress;
    const targetStop = Math.round(to * (adventureStops.length - 1));
    const delay = targetStop > currentStop && celebration ? 700 : 0;
    const isUnlockMotion = targetStop > currentStop && celebration !== null;
    let frame = 0;
    let clearTimer = 0;
    const startMotion = () => {
      if (motionTokenRef.current !== motionToken) return;
      const start = performance.now();
      const worldDistance = adventureDistanceBetween(from, to);
      const duration = Math.max(350, (worldDistance / ADVENTURE_WALK_SPEED) * 1000);
      const tick = (now: number) => {
        if (motionTokenRef.current !== motionToken) return;
        const ratio = Math.min(1, (now - start) / duration);
        const eased = ratio < .5 ? 4 * ratio ** 3 : 1 - Math.pow(-2 * ratio + 2, 3) / 2;
        updateProgress(from + (to - from) * eased);
        if (ratio < 1) {
          frame = requestAnimationFrame(tick);
          motionFrameRef.current = frame;
        }
        else {
          motionFrameRef.current = 0;
          if (isUnlockMotion) setCurrentStop(targetStop);
          updateProgress(to);
          if (isUnlockMotion) setArrivalStop(targetStop);
          setDesiredProgress(null);
          if (isUnlockMotion) {
            if (typeof window !== 'undefined') window.localStorage.setItem(unlockStorageKey, String(targetStop));
            clearTimer = window.setTimeout(() => { setCelebration(null); setArrivalStop(null); }, 1150);
          }
        }
      };
      frame = requestAnimationFrame(tick);
      motionFrameRef.current = frame;
    };
    const delayTimer = window.setTimeout(startMotion, delay);
    motionDelayRef.current = delayTimer;
    return () => {
      window.clearTimeout(delayTimer);
      window.clearTimeout(clearTimer);
      if (motionDelayRef.current === delayTimer) motionDelayRef.current = null;
      if (motionFrameRef.current === frame) motionFrameRef.current = 0;
      cancelAnimationFrame(frame);
    };
  }, [currentStop, desiredProgress, celebration]);

  useEffect(() => {
    if (heldDirection === null) return undefined;
    const maxProgress = Math.max(0, unlockedTarget) / (adventureStops.length - 1);
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(40, now - previous);
      previous = now;
      const distance = (elapsed / 1000) * ADVENTURE_WALK_SPEED;
      const progressDelta = progressDeltaForDistance(progressRef.current, distance);
      const next = Math.max(0, Math.min(maxProgress, progressRef.current + heldDirection * progressDelta));
      updateProgress(next);
      const reachedRightLock = heldDirection > 0 && next >= maxProgress;
      const reachedLeftEdge = heldDirection < 0 && next <= 0;
      if (reachedRightLock || reachedLeftEdge) {
        if (reachedRightLock && maxProgress < 1) setLockNotice(Math.min(Math.max(0, unlockedTarget) + 1, adventureStops.length - 1));
        setHeldDirection(null);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [heldDirection, unlockedTarget]);

  const footDebugProgress = readFootDebugProgress();
  const position = adventurePosition(footDebugProgress ?? progress);
  const previousPositionX = useRef(position.x);
  const lastDirection = useRef<'left' | 'right'>('right');
  const isMoving = footDebugProgress === null && (desiredProgress !== null || heldDirection !== null);
  const movementDirection = position.x < previousPositionX.current - 0.1
    ? 'left'
    : position.x > previousPositionX.current + 0.1
      ? 'right'
      : lastDirection.current;
  const walkDistanceRef = useRef(0);
  const previousWalkPositionRef = useRef({ x: position.x, y: position.y });
  useEffect(() => {
    if (position.x < previousPositionX.current - 0.1) lastDirection.current = 'left';
    if (position.x > previousPositionX.current + 0.1) lastDirection.current = 'right';
    previousPositionX.current = position.x;
  }, [position.x]);
  useEffect(() => {
    const previous = previousWalkPositionRef.current;
    if (isMoving) {
      walkDistanceRef.current += Math.hypot(position.x - previous.x, position.y - previous.y);
    }
    previousWalkPositionRef.current = { x: position.x, y: position.y };
  }, [isMoving, position.x, position.y]);
  const walkFrameIndex = Math.floor(walkDistanceRef.current / ADVENTURE_WALK_FRAME_DISTANCE) % 4;
  const explorerFrame = isMoving
    ? {
      ...explorerWalkFrames[movementDirection][walkFrameIndex],
      width: 1254,
      height: 1254,
      visualWidth: explorerFrames[movementDirection].visualWidth,
      alt: movementDirection === 'left' ? '?쇱そ?쇰줈 ?걷? ?쇳궎' : '?ㅻⅨ履쎌쑝濡??걷? ?쇳궎',
    }
    : explorerFrames.idle;
  const renderAnchor = isMoving ? explorerWalkRenderAnchor : explorerFrame.footAnchor;
  const worldViewportRef = useRef<HTMLDivElement>(null);
  const initialViewportWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth, 900) : adventureWorld.viewportWidth;
  const initialViewportHeight = typeof window !== 'undefined' ? Math.min(window.innerHeight, 470) : adventureWorld.viewportHeight;
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: initialViewportWidth, height: initialViewportHeight });
  useLayoutEffect(() => {
    const element = worldViewportRef.current;
    if (!element) return;
    const syncSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setViewportSize(previous => previous.width === rect.width && previous.height === rect.height
        ? previous
        : { width: rect.width, height: rect.height });
    };
    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const cameraViewportWidth = viewportSize.width <= 560 ? 680 : viewportSize.width <= 900 ? 780 : adventureWorld.viewportWidth;
  const viewportScale = viewportSize.width / cameraViewportWidth;
  const viewportHeight = viewportSize.height / Math.max(viewportScale, 0.001);
  const cameraX = Math.max(0, Math.min(adventureWorld.width - cameraViewportWidth, position.x - cameraViewportWidth / 2));
  const cameraFocusY = viewportSize.width <= 560 ? .72 : .58;
  const cameraY = Math.max(0, Math.min(adventureWorld.height - viewportHeight, position.y - viewportHeight * cameraFocusY));
  const worldStyle = {
    width: `${(adventureWorld.width / cameraViewportWidth) * 100}%`,
    height: `${(adventureWorld.height / viewportHeight) * 100}%`,
    transform: `translate3d(-${(cameraX / adventureWorld.width) * 100}%, -${(cameraY / adventureWorld.height) * 100}%, 0)`,
  };
  const chooseFromPoint = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail > 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const worldX = cameraX + ((event.clientX - rect.left) / rect.width) * cameraViewportWidth;
    const worldY = cameraY + ((event.clientY - rect.top) / rect.height) * viewportHeight;
    const requestedProgress = nearestAdventureProgress(worldX, worldY);
    const availableMaxProgress = Math.max(0, unlockedTarget) / (adventureStops.length - 1);
    if (requestedProgress > availableMaxProgress + 0.008) {
      setLockNotice(Math.min(Math.max(0, unlockedTarget) + 1, adventureStops.length - 1));
      return;
    }
    cancelAutomaticMotion();
    setLockNotice(null);
    setHeldDirection(null);
    setDesiredProgress(current => Math.abs((current ?? progressRef.current) - requestedProgress) < 0.004 ? null : requestedProgress);
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1 as const;
    cancelAutomaticMotion();
    setLockNotice(null);
    setDesiredProgress(null);
    setHeldDirection(direction);
  };

  const stopKeyboardMove = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') setHeldDirection(null);
  };

  const footDebug = isFootDebugEnabled();
  const terrainDebug = isTerrainDebugEnabled();
  const [footDebugError, setFootDebugError] = useState({ x: 0, y: 0 });
  const footActualRef = useRef<HTMLSpanElement>(null);
  const footTargetRef = useRef<SVGCircleElement>(null);
  useLayoutEffect(() => {
    if (!footDebug || !footActualRef.current || !footTargetRef.current) return;
    const actual = footActualRef.current.getBoundingClientRect();
    const target = footTargetRef.current.getBoundingClientRect();
    setFootDebugError({
      x: (actual.left + actual.width / 2) - (target.left + target.width / 2),
      y: (actual.top + actual.height / 2) - (target.top + target.height / 2),
    });
  }, [footDebug, position.x, position.y, cameraX, cameraY]);
  const debugPath = adventureRoutePath();
  const debugGroundLeftPath = adventureRoutePath(0, 11);
  const debugBridgePath = adventureRoutePath(11, 19);
  const debugGroundRightPath = adventureRoutePath(19, adventureRoute.length - 1);

  return <div className="lxp-secret__path-wrap lxp-secret__path-wrap--living lxp-secret__viewport" role="group" tabIndex={0} aria-label="피키의 비밀길. 열린 길을 클릭하거나 방향키를 눌러 자유롭게 이동할 수 있어요." onPointerDown={event => event.currentTarget.focus()} onKeyDown={moveWithKeyboard} onKeyUp={stopKeyboardMove} onBlur={() => setHeldDirection(null)} onClick={chooseFromPoint} onDoubleClick={() => setJumpKey(key => key + 1)}>
    <div ref={worldViewportRef} className="lxp-secret__world-viewport">
      <div className="lxp-secret__world" style={worldStyle}>
      <WorldTerrainLayer unlockedTarget={Math.max(currentStop, unlockedTarget)} />
      {footDebug && <svg className="lxp-secret__foot-debug" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={debugPath} />
        <circle ref={footTargetRef} className="lxp-secret__foot-debug-target" cx={position.x} cy={position.y} r="13" />
        <text x={position.x + 18} y={position.y - 18}>target {Math.round(position.x)},{Math.round(position.y)}</text>
        <text x={position.x + 18} y={position.y + 22}>screen Δ {footDebugError.x.toFixed(1)},{footDebugError.y.toFixed(1)}px</text>
      </svg>}
      {terrainDebug && <svg className="lxp-secret__terrain-debug" viewBox={`0 0 ${adventureWorld.width} ${adventureWorld.height}`} preserveAspectRatio="none" aria-hidden="true">
        <path className="lxp-secret__terrain-debug-ground" d={debugGroundLeftPath} />
        <path className="lxp-secret__terrain-debug-bridge" d={debugBridgePath} />
        <path className="lxp-secret__terrain-debug-ground" d={debugGroundRightPath} />
      </svg>}
      <ol className={`lxp-secret__living-points ${terrainDebug ? 'is-terrain-debug' : ''}`} aria-label="피키의 비밀길 목적지">
        {adventureStops.map((stop, index) => {
          const unlocked = index <= Math.max(currentStop, unlockedTarget);
          const arrived = index <= currentStop;
          const labelStyle = {
            left: `${((stop.landmark.x + stop.labelOffset.x) / adventureWorld.width) * 100}%`,
            top: `${((stop.landmark.y + stop.labelOffset.y) / adventureWorld.height) * 100}%`,
          };
          return <li key={stop.title} className={`lxp-secret__living-point ${unlocked ? 'is-unlocked' : 'is-locked'} ${arrived ? 'is-arrived' : ''} ${arrivalStop === index ? 'is-arrival-celebrating' : ''}`}>
            <span className="lxp-secret__place-label lxp-secret__place-label--world" style={labelStyle}><strong>{stop.title}</strong></span>
          </li>;
        })}
      </ol>
      {!terrainDebug && <div key={jumpKey} className={`lxp-secret__traveler ${jumpKey ? 'is-jumping' : ''}`} data-moving={isMoving} data-direction={movementDirection} data-foot-debug={footDebug ? 'true' : undefined} style={{ left: `${(position.x / adventureWorld.width) * 100}%`, top: `${(position.y / adventureWorld.height) * 100}%`, '--traveler-angle': `${position.angle}deg`, '--traveler-width': `${explorerFrame.visualWidth}px`, '--traveler-aspect-ratio': `${explorerFrame.width} / ${explorerFrame.height}`, '--render-anchor-x': `${renderAnchor.x * 100}%`, '--render-anchor-y': `${renderAnchor.y * 100}%`, '--foot-anchor-x': `${explorerFrame.footAnchor.x * 100}%`, '--foot-anchor-y': `${explorerFrame.footAnchor.y * 100}%` } as CSSProperties}>
        <span className="lxp-secret__traveler-visual">
          <img className="lxp-secret__traveler-image" src={explorerFrame.src} alt={explorerFrame.alt} draggable="false" />
          {footDebug && <span ref={footActualRef} className="lxp-secret__foot-debug-actual" aria-hidden="true" />}
        </span>
      </div>}
      </div>
    </div>
    {celebration && <div className="lxp-secret__unlock-celebration" role="status" aria-live="polite"><strong>{celebration}</strong><span>새로운 모험이 기다려!</span></div>}
    {lockNotice !== null && <div className="lxp-secret__lock-notice" role="dialog" aria-modal="false" aria-label="잠긴 탐험지 안내" onClick={event => event.stopPropagation()}><strong>{adventureStops[lockNotice].title}</strong><span>아직 잠겨 있는 탐험지예요.</span><button type="button" onClick={() => setLockNotice(null)}>닫기</button></div>}
  </div>;
}

function PlayMemoryCard({ successCount, roundCount }: Pick<Props, 'successCount' | 'roundCount'>) {
  const hasPlay = successCount > 0 || roundCount > 0;
  const memory = successCount > 0
    ? { icon: '✊', message: '오늘도 같이 놀았네!' }
    : roundCount > 0
      ? { icon: '🌱', message: '피키랑 처음 놀았어!' }
      : { icon: '💭', message: '우리의 첫 추억을 만들어 볼까?' };
  return <section className={`lxp-secret__story lxp-secret__story--memory lxp-secret__memory-card ${hasPlay ? 'has-play-memory' : 'is-empty'}`} aria-labelledby="lxp-memory-title">
    <span className="lxp-secret__memory-icon" aria-hidden="true">{memory.icon}</span>
    <div>
      <span>피키와 반짝이는 순간</span>
      <h2 id="lxp-memory-title">{memory.message}</h2>
      <p>{hasPlay ? '함께 놀았던 순간을 기억해요.' : '피키가 첫 놀이를 기다리고 있어요.'}</p>
    </div>
  </section>;
}

const treasureProgressStorageKey = 'pikipick.secret-treasure-progress.v1';

function readTreasureProgress(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(treasureProgressStorageKey) ?? 'null');
    return value && Array.isArray(value.earnedIds) && value.earnedIds.every((id: unknown) => typeof id === 'string')
      ? value.earnedIds
      : null;
  } catch {
    return null;
  }
}

function saveTreasureProgress(earnedIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(treasureProgressStorageKey, JSON.stringify({ earnedIds }));
  } catch {
    // Storage may be unavailable in private browsing; the visual still works for this mount.
  }
}

function TreasureDisplay({ concepts }: { concepts: FantasyBadgeConcept[] }) {
  const earnedConcepts = concepts.filter(concept => concept.sourceId);
  const earnedIdsKey = earnedConcepts.map(concept => concept.id).join('|');
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const previousEarnedIds = useRef<string[] | null>(null);

  useEffect(() => {
    const currentIds = earnedConcepts.map(concept => concept.id);
    const storedEarnedIds = readTreasureProgress();
    const baselineIds = previousEarnedIds.current ?? storedEarnedIds ?? currentIds;
    if (previousEarnedIds.current === null && storedEarnedIds === null) {
      previousEarnedIds.current = currentIds;
      saveTreasureProgress(currentIds);
      return;
    }

    const newlyEarned = currentIds.find(id => !baselineIds.includes(id));
    previousEarnedIds.current = currentIds;
    saveTreasureProgress(currentIds);
    if (!newlyEarned) return;

    setRevealingId(newlyEarned);
    const timeoutId = window.setTimeout(() => setRevealingId(null), 2700);
    return () => window.clearTimeout(timeoutId);
  }, [earnedIdsKey]);

  const revealedConcept = revealingId ? earnedConcepts.find(concept => concept.id === revealingId) : undefined;
  const isOpen = Boolean(revealedConcept);

  return <section className="lxp-secret__treasure-display" aria-label="내가 발견한 보물">
    <span className={`lxp-secret__treasure-case ${isOpen ? 'is-open' : 'is-closed'}`} aria-hidden="true">
      <span className="lxp-secret__treasure-glow" aria-hidden="true" />
      <img className="lxp-secret__treasure-chest-image" src={secretLandAssets.treasureChest} alt="" aria-hidden="true" />
      {!isOpen && <span className="lxp-secret__treasure-closed-lid" aria-hidden="true" />}
      {revealedConcept && <span className="lxp-secret__treasure-slot is-newest"><BadgeVisual concept={revealedConcept} earned /></span>}
      {isOpen && <img className="lxp-secret__treasure-chest-front-mask" src={secretLandAssets.treasureChest} alt="" aria-hidden="true" />}
    </span>
    <span className="lxp-secret__treasure-heading">
      <strong>내가 발견한 보물</strong>
      <small>소중한 보물이 반짝여요</small>
    </span>
  </section>;
}

function MagicBadgeBook({ onOpen, concepts }: { onOpen: () => void; concepts: FantasyBadgeConcept[] }) {
  return <button type="button" className="lxp-secret__badge-book" onClick={onOpen} aria-label="나의 마법 배지 도감 열기">
    <span className="lxp-secret__badge-book-art" aria-hidden="true"><img src={secretLandAssets.badgeBook} alt="" />{concepts.slice(0, 3).map(concept => <span key={concept.id} className={`lxp-secret__book-gem lxp-secret__book-gem--${concept.art}`} />)}</span>
    <span className="lxp-secret__badge-book-copy"><strong>나의 마법 배지 도감</strong><small>보물 이야기를 펼쳐 봐요</small></span>
  </button>;
}

export function LxpSecretLandDashboard({ successCount, partyCount, roundCount, onBadges, onPlay }: Props) {
  const earned = earnedIds(successCount);
  const orderedEarned = orderedBadgeConcepts(successCount).filter(concept => concept.sourceId && earned.has(concept.sourceId));
  void partyCount;
  void onPlay;
  return <div className="lxp-secret">
    <header className="lxp-secret__adventure-heading">
      <span>두근두근 신나는 탐험!</span>
      <h2 id="lxp-secret-title">피키와 함께 떠나는 모험 대장전</h2>
      <p>내가 해 본 놀이가 모험길에 남아요.</p>
    </header>
    <div className="lxp-secret__top">
      <TreasureDisplay concepts={orderedEarned} />
      <MagicBadgeBook concepts={orderedEarned} onOpen={onBadges} />
    </div>
    <section className="lxp-secret__map" aria-labelledby="lxp-secret-title"><LivingPath successCount={successCount} roundCount={roundCount} /></section>
    <div className="lxp-secret__bottom"><section className="lxp-secret__story"><span aria-hidden="true">🌿</span><div><span>조금만 더 노력하면!</span><h2>다음 목표는 아직 정하지 않았어요</h2><p>기록이 충분해지면 다음 경험을 연결해 보여 줄게요.</p></div></section><PlayMemoryCard successCount={successCount} roundCount={roundCount} /></div>
  </div>;
}

function LegacyLxpSecretLandDashboardTopRedesign({ successCount, partyCount, roundCount, onBadges, onPlay }: Props) {
  const orderedEarned = orderedBadgeConcepts(successCount).filter(concept => concept.sourceId && earnedIds(successCount).has(concept.sourceId));
  void partyCount;
  void onPlay;
  return <div className="lxp-secret">
    <div className="lxp-secret__top">
      <TreasureDisplay key={successCount} concepts={orderedEarned} />
      <button type="button" className="lxp-secret__badge-button" onClick={onBadges} aria-label="나의 배지함 열기"><span aria-hidden="true">🎒</span><span>나의 배지함 열기</span></button>
    </div>
    <section className="lxp-secret__map" aria-labelledby="lxp-secret-title"><div className="lxp-secret__heading"><span>피키와 함께 떠나는</span><h2 id="lxp-secret-title">비밀길을 찾아요!</h2><p>내가 해 본 놀이가 모험길에 남아요.</p></div><LivingPath successCount={successCount} roundCount={roundCount} /></section>
    <div className="lxp-secret__bottom"><section className="lxp-secret__story"><span aria-hidden="true">🌿</span><div><span>조금만 더 노력하면!</span><h2>다음 목표는 아직 정하지 않았어요</h2><p>기록이 충분해지면 다음 경험을 연결해 보여 줄게요.</p></div></section><PlayMemoryCard successCount={successCount} roundCount={roundCount} /></div>
  </div>;
}

function LegacyLxpSecretLandDashboardActive({ successCount, partyCount, roundCount, onBadges, onPlay }: Props) {
  const earned = earnedIds(successCount);
  const earnedBadges = secretBadges.filter(badge => earned.has(badge.id)).map(fantasyConceptForBadge);
  void partyCount;
  void onPlay;
  return <div className="lxp-secret">
    <div className="lxp-secret__top">
      <section className="lxp-secret__preview" aria-label="최근 발견한 보물 미리보기"><span>내가 발견한 보물</span><div>{earnedBadges.length ? earnedBadges.slice(0, 5).map(concept => <BadgeVisual key={concept.id} concept={concept} earned />) : <small>아직 발견한 배지가 없어요.</small>}</div></section>
      <button type="button" className="lxp-secret__badge-button" onClick={onBadges} aria-label="나의 배지함 열기"><span aria-hidden="true">🎒</span><span>나의 배지함 열기</span></button>
    </div>
    <section className="lxp-secret__map" aria-labelledby="lxp-secret-title"><div className="lxp-secret__heading"><span>피키와 함께 떠나는</span><h2 id="lxp-secret-title">비밀길을 찾아요!</h2><p>내가 해 본 놀이가 모험길에 남아요.</p></div><LivingPath successCount={successCount} roundCount={roundCount} /></section>
    <div className="lxp-secret__bottom">
      <section className="lxp-secret__story"><span aria-hidden="true">🌿</span><div><span>조금만 더 노력하면!</span><h2>다음 목표는 아직 정하지 않았어요</h2><p>기록이 충분해지면 다음 경험을 연결해 보여 줄게요.</p></div></section>
      <PlayMemoryCard successCount={successCount} roundCount={roundCount} />
    </div>
  </div>;
}

function LegacyActiveLxpSecretLandDashboard({ successCount, partyCount, roundCount, onBadges, onPlay }: Props) {
  const earned = earnedIds(successCount);
  const earnedBadges = secretBadges.filter(badge => earned.has(badge.id)).map(fantasyConceptForBadge);
  void onPlay;
  return <div className="lxp-secret"><div className="lxp-secret__top"><section className="lxp-secret__preview" aria-label="획득한 배지 미리보기"><span>내가 발견한 보물</span><div>{earnedBadges.length ? earnedBadges.slice(0, 5).map(concept => <BadgeVisual key={concept.id} concept={concept} earned />) : <small>아직 발견한 배지가 없어요.</small>}</div></section><button type="button" className="lxp-secret__badge-button" onClick={onBadges} aria-label="나의 배지함 열기"><span aria-hidden="true">🎒</span><span>나의 배지함 열기</span></button></div><section className="lxp-secret__map" aria-labelledby="lxp-secret-title"><div className="lxp-secret__heading"><span>피키와 함께 떠나는</span><h2 id="lxp-secret-title">비밀길을 찾아요!</h2><p>내가 해 본 놀이가 모험길에 남아요.</p></div><LivingPath successCount={successCount} roundCount={roundCount} /></section><div className="lxp-secret__bottom"><section className="lxp-secret__story"><span aria-hidden="true">🌿</span><div><span>조금만 더 노력하면!</span><h2>다음 목표는 아직 정하지 않았어요</h2><p>기록이 충분해지면 다음 경험을 연결해 보여 줄게요.</p></div></section><section className="lxp-secret__story lxp-secret__story--memory"><span aria-hidden="true">📖</span><div><span>그땐 이런 일이 펼쳐져!</span><h2>내 놀이 기억</h2><p>기록과 연결된 배지만 보여줘요.</p><div className="lxp-secret__earned">{earnedBadges.map(concept => <BadgeVisual key={concept.id} concept={concept} earned />)}{!earnedBadges.length && <small>아직 연결된 배지가 없어요.</small>}</div></div></section></div></div>;
}
