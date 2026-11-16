import { useState } from 'react';
import { pikiExpressions, pikiHands } from '../assets/characters/piki/assetMap';
import type { Gesture } from '../game/types';

type Scene = 'map-start' | 'map-discovered' | 'game' | 'celebration' | 'collection' | 'detail' | 'opening';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: string;
  tone: string;
}

const badges: Badge[] = [
  { id: 'first-step', name: '첫 걸음 병아리', icon: '🐣', description: '처음 놀이를 끝까지 함께했어요.', condition: '첫 놀이 완료', tone: 'sun' },
  { id: 'try-again', name: '다시 해 본 토끼', icon: '🐰', description: '틀려도 한 번 더 생각해 보았어요.', condition: '실패 뒤 재도전', tone: 'leaf' },
  { id: 'brave-lion', name: '용감한 사자', icon: '🦁', description: '어려웠던 놀이를 해냈어요.', condition: '실패 뒤 성공', tone: 'coral' },
  { id: 'rainbow', name: '무지개 길', icon: '🌈', description: '즐겁게 여러 번 놀았어요.', condition: '성공 5번', tone: 'sky' },
  { id: 'crown', name: '반짝 왕관', icon: '👑', description: '꾸준히 놀이를 이어 갔어요.', condition: '성공 10번', tone: 'sun' },
  { id: 'butterfly', name: '나비 발견', icon: '🦋', description: '새로운 놀이를 처음 만났어요.', condition: '새 활동 첫 참여', tone: 'lilac' },
  { id: 'acorn', name: '도토리 모음', icon: '🌰', description: '여러 종류의 놀이를 골랐어요.', condition: '서로 다른 활동 참여', tone: 'leaf' },
  { id: 'owl', name: '규칙 부엉이', icon: '🦉', description: '놀이 규칙을 끝까지 따라 했어요.', condition: '규칙 연습 완료', tone: 'sky' },
  { id: 'chest', name: '보물 상자', icon: '🧰', description: '특별한 탐험 순간을 만났어요.', condition: '특별 활동 완료', tone: 'coral' },
  { id: 'key', name: '새 길 열쇠', icon: '🗝️', description: '새로운 탐험 공간을 발견했어요.', condition: '새 구역 발견', tone: 'lilac' },
];

const sceneNames: Record<Scene, string> = {
  'map-start': '처음 지도', 'map-discovered': '발견한 지도', game: '놀이 화면', celebration: '배지 축하', collection: '배지 모음', detail: '배지 자세히', opening: '새 공간 열기',
};

function Hand({ gesture, className = '' }: { gesture: Gesture; className?: string }) {
  const labels: Record<Gesture, string> = { ROCK: '바위', SCISSORS: '가위', PAPER: '보' };
  return <img className={`lxp-hand ${className}`} src={pikiHands[gesture]} alt={`피키 ${labels[gesture]} 손`} />;
}

function BadgeMark({ badge, large = false }: { badge: Badge; large?: boolean }) {
  return <span className={`lxp-badge lxp-badge--${badge.tone} ${large ? 'lxp-badge--large' : ''}`} aria-label={badge.name}>{badge.icon}</span>;
}

export function LxpAdventurePreview() {
  const [scene, setScene] = useState<Scene>('map-start');
  const [selectedBadge, setSelectedBadge] = useState<Badge>(badges[0]);
  const [isDiscovered, setIsDiscovered] = useState(false);
  const earned = isDiscovered ? badges.slice(0, 6) : badges.slice(0, 2);

  const go = (next: Scene) => setScene(next);
  const showDetail = (badge: Badge) => { setSelectedBadge(badge); setScene('detail'); };

  return <main className="lxp-preview">
    <header className="lxp-topbar">
      <div className="lxp-brand"><img src="/src/assets/brand/pikipick-logo.png" alt="PIKIPICK" /><span>피키와 놀이 모험</span></div>
      <p className="lxp-demo-note">데모 미리보기 · 실제 기록과 연결되지 않아요</p>
      <button className="lxp-pouch" onClick={() => go('collection')} aria-label="배지 모음 보기"><span>🎒</span><b>{earned.length}</b></button>
    </header>

    <nav className="lxp-scene-nav" aria-label="미리보기 장면 선택">
      {(Object.keys(sceneNames) as Scene[]).map((key) => <button key={key} onClick={() => go(key)} className={scene === key ? 'is-active' : ''}>{sceneNames[key]}</button>)}
    </nav>

    {scene === 'map-start' && <MapScene discovered={false} onPlay={() => go('game')} onCollection={() => go('collection')} />}
    {scene === 'map-discovered' && <MapScene discovered onPlay={() => go('game')} onCollection={() => go('collection')} />}
    {scene === 'game' && <GameScene onBadge={() => { setIsDiscovered(true); go('celebration'); }} onMap={() => go(isDiscovered ? 'map-discovered' : 'map-start')} />}
    {scene === 'celebration' && <CelebrationScene badge={badges[3]} onContinue={() => go('opening')} />}
    {scene === 'collection' && <CollectionScene earned={earned} onSelect={showDetail} onMap={() => go(isDiscovered ? 'map-discovered' : 'map-start')} />}
    {scene === 'detail' && <BadgeDetail badge={selectedBadge} onBack={() => go('collection')} />}
    {scene === 'opening' && <OpeningScene onMap={() => go('map-discovered')} />}
  </main>;
}

function MapScene({ discovered, onPlay, onCollection }: { discovered: boolean; onPlay: () => void; onCollection: () => void }) {
  return <section className="lxp-stage lxp-map-stage">
    <div className="lxp-map-copy"><span className="lxp-kicker">나의 산책 지도</span><h1>피키와 놀러 가자!</h1><p>놀이를 하면 길에서 새로운 이야기를 만나요.</p></div>
    <div className="lxp-map" aria-label="피키의 놀이 모험 지도">
      <div className="lxp-cloud lxp-cloud--one" /><div className="lxp-cloud lxp-cloud--two" />
      <div className="lxp-hill lxp-hill--left" /><div className="lxp-hill lxp-hill--right" />
      <div className="lxp-path" />
      <div className="lxp-place lxp-place--start"><span>🏡</span><small>출발</small></div>
      <button className="lxp-place lxp-place--rps" onClick={onPlay}><span>✊✌️🖐️</span><strong>가위바위보</strong><small>지금 놀 수 있어요</small></button>
      <div className="lxp-piki-pin"><img src={pikiExpressions.basicGreeting} alt="길 위의 피키" /><span>여기!</span></div>
      <div className="lxp-place lxp-place--count is-future"><span>🔢</span><strong>수 세기</strong><small>다음에 만나요</small></div>
      <div className="lxp-place lxp-place--pattern is-future"><span>🟡🔵</span><strong>패턴 길</strong><small>다음에 만나요</small></div>
      <div className="lxp-place lxp-place--books is-future"><span>📖</span><strong>그림책 숲</strong><small>다음에 만나요</small></div>
      <div className="lxp-flowers">✿ ✿ ✿ ✿ ✿</div><div className="lxp-bridge">▰▰▰</div>
      {discovered && <button className="lxp-new-space" onClick={onCollection}><span>🗝️</span><b>새 길을 발견했어!</b><small>배지 모음에서 보기</small></button>}
    </div>
    <aside className="lxp-place-panel"><span className="lxp-panel-icon">✊✌️🖐️</span><div><span className="lxp-kicker">첫 번째 놀이 장소</span><h2>가위바위보 들판</h2><p>피키의 손을 보고 놀이를 골라요.</p></div><button className="lxp-primary" onClick={onPlay}>놀이 시작 <span>→</span></button></aside>
  </section>;
}

function GameScene({ onBadge, onMap }: { onBadge: () => void; onMap: () => void }) {
  return <section className="lxp-stage lxp-game-stage">
    <button className="lxp-back" onClick={onMap}>← 지도</button>
    <div className="lxp-game-pouch"><span>🎒</span><small>새 배지</small></div>
    <div className="lxp-game-field"><div className="lxp-game-piki"><img src={pikiExpressions.playful} alt="손을 낸 피키" /><Hand gesture="SCISSORS" /></div><div className="lxp-versus">?</div><div className="lxp-game-child"><Hand gesture="ROCK" /><span>내 손</span></div></div>
    <div className="lxp-game-prompt"><h1>어떤 손을 낼까?</h1><p>피키의 손을 보고 골라 봐.</p></div>
    <div className="lxp-game-choices"><button onClick={onBadge}><Hand gesture="ROCK" /><span>바위</span></button><button onClick={onBadge}><Hand gesture="SCISSORS" /><span>가위</span></button><button onClick={onBadge}><Hand gesture="PAPER" /><span>보</span></button></div>
  </section>;
}

function CelebrationScene({ badge, onContinue }: { badge: Badge; onContinue: () => void }) {
  return <section className="lxp-stage lxp-celebration"><span className="lxp-spark lxp-spark--one">✦</span><span className="lxp-spark lxp-spark--two">✦</span><img src={pikiExpressions.successHappy} alt="기뻐하는 피키" /><p>피키가 박수 짝짝!</p><BadgeMark badge={badge} large /><h1>{badge.name} 배지를 찾았어!</h1><p>{badge.description}</p><button className="lxp-primary" onClick={onContinue}>새 길 보러 가기 <span>→</span></button></section>;
}

function CollectionScene({ earned, onSelect, onMap }: { earned: Badge[]; onSelect: (badge: Badge) => void; onMap: () => void }) {
  return <section className="lxp-stage lxp-collection"><button className="lxp-back" onClick={onMap}>← 지도</button><div className="lxp-collection-heading"><span>🎒</span><div><span className="lxp-kicker">나의 탐험 주머니</span><h1>찾은 배지</h1><p>배지는 사라지지 않고, 피키와의 모험을 기억해 줘요.</p></div></div><div className="lxp-badge-grid">{badges.map((badge, index) => { const locked = index >= earned.length; return <button key={badge.id} className={`lxp-badge-card ${locked ? 'is-locked' : ''}`} onClick={() => !locked && onSelect(badge)} disabled={locked}><BadgeMark badge={badge} /><strong>{locked ? '아직 만나는 중' : badge.name}</strong><small>{locked ? '새 놀이에서 찾아요' : badge.condition}</small></button>; })}</div></section>;
}

function BadgeDetail({ badge, onBack }: { badge: Badge; onBack: () => void }) {
  return <section className="lxp-stage lxp-badge-detail"><button className="lxp-back" onClick={onBack}>← 배지 모음</button><div className="lxp-detail-card"><BadgeMark badge={badge} large /><span className="lxp-kicker">탐험 기록</span><h1>{badge.name}</h1><p>{badge.description}</p><dl><div><dt>찾은 이유</dt><dd>{badge.condition}</dd></div><div><dt>놀이의 뜻</dt><dd>결과보다 놀이에 참여하고 다시 해 본 경험을 소중히 기억해요.</dd></div></dl><img src={pikiExpressions.encourage} alt="응원하는 피키" /></div></section>;
}

function OpeningScene({ onMap }: { onMap: () => void }) {
  return <section className="lxp-stage lxp-opening"><div className="lxp-opening-door">🗝️</div><img src={pikiExpressions.surprised} alt="새 길을 발견한 피키" /><h1>숲 너머에 새 길이 열렸어!</h1><p>이 길은 앞으로 만나게 될 새로운 놀이를 기다리고 있어요.</p><div className="lxp-opening-land"><span>🌲</span><span>🌿</span><span>🌲</span><span>🏕️</span></div><button className="lxp-primary" onClick={onMap}>지도에서 보기 <span>→</span></button></section>;
}
