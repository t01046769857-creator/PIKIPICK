import type { GameMode, Gesture } from '../game/types';
import { pikiExpressions } from '../assets/characters/piki/assetMap';
import { PikiHand } from './PikiHand';
import './ModeCardHands.css';

// 카드 예시 전용: 왼쪽은 피키, 오른쪽은 아이이다. 게임 규칙과는 독립적이다.
export const modeCardExamples: Record<GameMode, { piki: Gesture; child: Gesture; winner: 'piki' | 'child' | null }> = {
  WIN: { piki: 'PAPER', child: 'SCISSORS', winner: 'child' },
  LOSE: { piki: 'SCISSORS', child: 'PAPER', winner: 'piki' },
  DRAW: { piki: 'SCISSORS', child: 'SCISSORS', winner: null },
};

function ChildBadge() {
  return <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
    <path d="M5 27c0-9 18-9 18 0" fill="#b9dcca" stroke="#70472f" strokeWidth="2"/>
    <circle cx="14" cy="12" r="9" fill="#ffe0c4" stroke="#70472f" strokeWidth="2"/>
    <path d="M7 7q5-8 13-1M10 12v1m8-1v1m-7 4q3 2 6 0" fill="none" stroke="#70472f" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export function ModeCardHands({ mode }: { mode?: GameMode }) {
  if (!mode) return <span className="mode-card-art mode-card-hands mode-card-hands--practice" aria-hidden="true">
    {(['ROCK', 'SCISSORS', 'PAPER'] as const).map(gesture => <span className="mode-hand-slot" key={gesture}><PikiHand decorative gesture={gesture}/></span>)}
  </span>;

  const example = modeCardExamples[mode];
  return <span className="mode-card-art mode-card-hands" aria-hidden="true">
    {(['piki', 'child'] as const).map(role => <span key={role} data-role={role}
      className={`mode-hand-slot ${example.winner === role ? 'is-winner' : ''} ${mode === 'DRAW' ? 'is-equal' : ''}`}>
      <span className="mode-hand-role">
        {role === 'piki' ? <img src={pikiExpressions.basicGreeting} alt="" draggable="false"/> : <ChildBadge/>}
        <span>{role === 'piki' ? '피키' : '나'}</span>
      </span>
      <span className="mode-hand-emphasis"><PikiHand decorative gesture={example[role]}/></span>
    </span>)}
  </span>;
}
