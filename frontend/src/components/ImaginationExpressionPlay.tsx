import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { PikiHand } from './PikiHand';
import type { Gesture } from '../game/types';
import './ImaginationExpressionPlay.css';
import expressionRps from '../assets/imagination/themes/expression-rps.png';
import expressionMukjjippa from '../assets/imagination/themes/expression-mukjjippa.png';
import expressionFingerCount from '../assets/imagination/themes/expression-finger-count.png';
import expressionNumbers from '../assets/imagination/themes/expression-numbers.png';
import expressionPatterns from '../assets/imagination/themes/expression-patterns.png';

type Motif = 'STAR' | 'HEART' | 'CIRCLE';
type Stage = 'SELECT' | 'GESTURE_SELECT' | 'DECORATE' | 'COMPLETE' | 'GALLERY';
type ExpressionThemeId = 'RPS' | 'MUKJJIPPA' | 'FINGER_COUNT' | 'NUMBERS' | 'PATTERNS';

interface Decoration {
  id: number;
  x: number;
  y: number;
  color: string;
  motif: Motif;
}

interface Artwork {
  id: string;
  gesture: Gesture;
  decorations: Decoration[];
  createdAt: number;
}

const artworkStorageKey = 'pikipick.imagination-expression.works.v1';
const palette = ['#f47a50', '#efb943', '#65a88b', '#6e9ed4', '#b77bd1'];
const motifs: { id: Motif; label: string; glyph: string }[] = [
  { id: 'STAR', label: '별 무늬', glyph: '★' },
  { id: 'HEART', label: '하트 무늬', glyph: '♥' },
  { id: 'CIRCLE', label: '동그라미 무늬', glyph: '●' },
];
const gestureOptions: { id: Gesture; label: string; hint: string }[] = [
  { id: 'SCISSORS', label: '가위', hint: '두 손가락을 쫙!' },
  { id: 'ROCK', label: '바위', hint: '단단한 주먹!' },
  { id: 'PAPER', label: '보', hint: '활짝 편 손!' },
];
const themeOptions: { id: ExpressionThemeId; label: string; image: string; implemented: boolean }[] = [
  { id: 'RPS', label: '손동작 꾸미기', image: expressionRps, implemented: true },
  { id: 'MUKJJIPPA', label: '묵·찌·빠 표현하기', image: expressionMukjjippa, implemented: false },
  { id: 'FINGER_COUNT', label: '손가락 수 표현하기', image: expressionFingerCount, implemented: false },
  { id: 'NUMBERS', label: '숫자로 표현하기', image: expressionNumbers, implemented: false },
  { id: 'PATTERNS', label: '모양과 순서 표현하기', image: expressionPatterns, implemented: false },
];

function isGesture(value: unknown): value is Gesture {
  return value === 'ROCK' || value === 'SCISSORS' || value === 'PAPER';
}

function isMotif(value: unknown): value is Motif {
  return value === 'STAR' || value === 'HEART' || value === 'CIRCLE';
}

function readWorks(): Artwork[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(artworkStorageKey) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Artwork => {
      if (!item || typeof item !== 'object') return false;
      const value = item as Partial<Artwork>;
      return typeof value.id === 'string' && isGesture(value.gesture) && typeof value.createdAt === 'number'
        && Array.isArray(value.decorations) && value.decorations.every(decoration => {
          if (!decoration || typeof decoration !== 'object') return false;
          const itemDecoration = decoration as Partial<Decoration>;
          return typeof itemDecoration.id === 'number' && typeof itemDecoration.x === 'number'
            && typeof itemDecoration.y === 'number' && typeof itemDecoration.color === 'string'
            && isMotif(itemDecoration.motif);
        });
    }).sort((left, right) => right.createdAt - left.createdAt);
  } catch {
    return [];
  }
}

function writeWorks(works: Artwork[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(artworkStorageKey, JSON.stringify(works));
  } catch {
    // 작품 보관 공간이 부족해도 현재 작품 꾸미기는 계속할 수 있다.
  }
}

function motifFor(decoration: Decoration): string {
  return motifs.find(motif => motif.id === decoration.motif)?.glyph ?? '★';
}

function ArtworkCanvas({
  gesture,
  decorations,
  interactive,
  onPlace,
}: {
  gesture: Gesture;
  decorations: Decoration[];
  interactive: boolean;
  onPlace?: (x: number, y: number) => void;
}) {
  const paintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const placeFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!interactive || !onPlace) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(18, Math.min(342, ((event.clientX - rect.left) / rect.width) * 360));
    const y = Math.max(18, Math.min(262, ((event.clientY - rect.top) / rect.height) * 280));
    const previous = lastPointRef.current;
    if (previous && Math.hypot(previous.x - x, previous.y - y) < 16) return;
    lastPointRef.current = { x, y };
    onPlace(x, y);
  };

  return <div className="imagination-canvas">
    <svg
      viewBox="0 0 360 280"
      className={`imagination-canvas__surface ${interactive ? 'is-interactive' : ''}`}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? '손동작을 꾸밀 공간' : '내가 꾸민 손동작'}
      onPointerDown={event => {
        if (!interactive) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        paintingRef.current = true;
        lastPointRef.current = null;
        placeFromPointer(event);
      }}
      onPointerMove={event => { if (paintingRef.current) placeFromPointer(event); }}
      onPointerUp={() => { paintingRef.current = false; lastPointRef.current = null; }}
      onPointerCancel={() => { paintingRef.current = false; lastPointRef.current = null; }}
    >
      <defs>
        <radialGradient id="imagination-paper" cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="1" stopColor="#f5e6cf" />
        </radialGradient>
        <filter id="imagination-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#8a624b" floodOpacity=".18" />
        </filter>
      </defs>
      <rect x="4" y="4" width="352" height="272" rx="30" fill="url(#imagination-paper)" stroke="#e5c9a7" strokeWidth="3" />
      <path d="M35 224 C92 250 268 250 325 224" fill="none" stroke="#f3d6a4" strokeWidth="5" strokeLinecap="round" />
      {decorations.map(decoration => <text
        key={decoration.id}
        x={decoration.x}
        y={decoration.y}
        textAnchor="middle"
        dominantBaseline="central"
        className="imagination-decoration"
        fill={decoration.color}
        stroke="#fffdf7"
        strokeWidth="2"
        paintOrder="stroke"
        aria-hidden="true"
      >{motifFor(decoration)}</text>)}
    </svg>
    <div className="imagination-canvas__hand" aria-hidden="true" style={{ filter: 'drop-shadow(0 7px 5px #77543b2b)' }}>
      <PikiHand gesture={gesture} decorative />
    </div>
  </div>;
}

export function ImaginationExpressionPlay({ onBack }: { onBack: () => void }) {
  const [stage, setStage] = useState<Stage>('SELECT');
  const [theme, setTheme] = useState<ExpressionThemeId | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [color, setColor] = useState(palette[0]);
  const [motif, setMotif] = useState<Motif>('STAR');
  const [works, setWorks] = useState<Artwork[]>([]);
  const nextDecorationId = useRef(1);

  useEffect(() => setWorks(readWorks()), []);

  const selectGesture = (nextGesture: Gesture) => {
    setGesture(nextGesture);
    setDecorations([]);
    setStage('DECORATE');
  };

  const selectTheme = (nextTheme: ExpressionThemeId) => {
    if (nextTheme !== 'RPS') return;
    setTheme(nextTheme);
    setGesture(null);
    setDecorations([]);
    setStage('GESTURE_SELECT');
  };

  const placeDecoration = (x: number, y: number) => {
    setDecorations(current => [...current, { id: nextDecorationId.current++, x, y, color, motif }]);
  };

  const finishArtwork = () => {
    if (!gesture) return;
    const artwork: Artwork = { id: `imagination-${Date.now()}`, gesture, decorations, createdAt: Date.now() };
    const nextWorks = [artwork, ...works].slice(0, 24);
    setWorks(nextWorks);
    writeWorks(nextWorks);
    setStage('COMPLETE');
  };

  const openWork = (artwork: Artwork) => {
    setGesture(artwork.gesture);
    setDecorations(artwork.decorations);
    setStage('COMPLETE');
  };

  if (stage === 'SELECT') return <section className="imagination-play" aria-labelledby="imagination-title">
    <header className="imagination-play__heading">
      <span className="imagination-play__eyebrow">내 손동작으로 만드는 작은 작품</span>
      <h2 id="imagination-title">어떤 표현 주제를 골라 볼까?</h2>
      <p>마음에 드는 주제를 고르고 나만의 작품을 만들어 봐요.</p>
    </header>
    <div className="imagination-theme-grid" role="list" aria-label="상상표현 주제 선택">
      {themeOptions.map(option => <button
        key={option.id}
        type="button"
        className={`imagination-theme-card ${option.implemented ? 'is-ready' : 'is-coming-soon'}`}
        onClick={() => selectTheme(option.id)}
        disabled={!option.implemented}
        aria-label={`${option.label}${option.implemented ? '' : ' (준비 중)'}`}
      >
        <img src={option.image} alt={option.label} />
        {!option.implemented && <span className="imagination-theme-card__status">준비 중</span>}
      </button>)}
    </div>
    <div className="imagination-play__actions">
      <button type="button" className="secondary-action" onClick={() => setStage('GALLERY')}>작품 보기</button>
      <button type="button" className="text-action" onClick={onBack}>돌아가기</button>
    </div>
  </section>;

  if (stage === 'GESTURE_SELECT') return <section className="imagination-play" aria-labelledby="imagination-gesture-title">
    <header className="imagination-play__heading">
      <span className="imagination-play__eyebrow">손동작 꾸미기</span>
      <h2 id="imagination-gesture-title">어떤 손동작을 꾸며 볼까?</h2>
      <p>가위·바위·보 중 하나를 골라 나만의 그림을 만들어 봐요.</p>
    </header>
    <div className="imagination-gesture-grid" role="list" aria-label="꾸밀 손동작 선택">
      {gestureOptions.map(option => <button key={option.id} type="button" className={`imagination-gesture-card is-${option.id.toLowerCase()}`} onClick={() => selectGesture(option.id)}>
        <span className="imagination-gesture-card__art"><PikiHand gesture={option.id} decorative /><i className="imagination-pencil" aria-hidden="true" /></span>
        <strong>{option.label}</strong>
        <span>{option.hint}</span>
      </button>)}
    </div>
    <div className="imagination-play__actions">
      <button type="button" className="text-action" onClick={() => { setTheme(null); setStage('SELECT'); }}>주제 다시 고르기</button>
      <button type="button" className="text-action" onClick={onBack}>돌아가기</button>
    </div>
  </section>;

  if (stage === 'GALLERY') return <section className="imagination-play" aria-labelledby="imagination-gallery-title">
    <header className="imagination-play__heading">
      <span className="imagination-play__eyebrow">내가 만든 손동작 그림</span>
      <h2 id="imagination-gallery-title">작품 보관함</h2>
      <p>완성한 작품을 다시 보고, 마음에 들면 다시 꾸며 볼 수 있어요.</p>
    </header>
    {works.length === 0 ? <div className="imagination-empty"><span aria-hidden="true">✎</span><p>아직 작품이 없어요.<br />손동작을 골라 첫 작품을 만들어 볼까요?</p></div> : <div className="imagination-gallery" role="list" aria-label="완성한 작품 목록">
      {works.map(work => <button type="button" className="imagination-gallery__item" key={work.id} onClick={() => openWork(work)} aria-label="이 작품 다시 보기">
        <ArtworkCanvas gesture={work.gesture} decorations={work.decorations} interactive={false} />
      </button>)}
    </div>}
    <div className="imagination-play__actions"><button type="button" className="secondary-action" onClick={() => setStage('SELECT')}>새 작품 만들기</button><button type="button" className="text-action" onClick={onBack}>돌아가기</button></div>
  </section>;

  if (!gesture) return null;
  return <section className="imagination-play" aria-labelledby="imagination-editor-title">
    <header className="imagination-play__heading">
      <span className="imagination-play__eyebrow">{theme === 'RPS' ? '손동작 꾸미기' : '상상표현놀이'}</span>
      <h2 id="imagination-editor-title">내 손동작을 멋지게 꾸며요!</h2>
      <p>색을 고르고, 무늬를 골라 손동작 주변에 톡톡 찍어 보세요.</p>
    </header>
    <ArtworkCanvas gesture={gesture} decorations={decorations} interactive={stage === 'DECORATE'} onPlace={placeDecoration} />
    {stage === 'DECORATE' && <>
      <div className="imagination-toolbar" aria-label="꾸미기 도구">
        <div className="imagination-tool-group"><span>색</span>{palette.map(item => <button key={item} type="button" className={`imagination-swatch ${color === item ? 'is-selected' : ''}`} style={{ backgroundColor: item }} onClick={() => setColor(item)} aria-label={`${item} 색상`} />)}</div>
        <div className="imagination-tool-group"><span>무늬</span>{motifs.map(item => <button key={item.id} type="button" className={`imagination-motif ${motif === item.id ? 'is-selected' : ''}`} onClick={() => setMotif(item.id)} aria-label={item.label}>{item.glyph}</button>)}</div>
      </div>
      <div className="imagination-editor-actions">
        <button type="button" className="text-action" onClick={() => setDecorations(current => current.slice(0, -1))} disabled={decorations.length === 0}>실행 취소</button>
        <button type="button" className="text-action" onClick={() => setDecorations([])}>다시 시작</button>
        <button type="button" className="primary" onClick={finishArtwork}>완성!</button>
      </div>
    </>}
    {stage === 'COMPLETE' && <div className="imagination-complete-actions">
      <p role="status">멋진 작품이 완성됐어요!</p>
      <div><button type="button" className="secondary-action" onClick={() => setStage('DECORATE')}>다시 꾸미기</button><button type="button" className="secondary-action" onClick={() => setStage('GALLERY')}>작품 보기</button><button type="button" className="text-action" onClick={onBack}>돌아가기</button></div>
    </div>}
  </section>;
}
