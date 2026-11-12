import { useEffect, useRef } from 'react';
import './StoryNavigation.css';
import { PikiHand } from './PikiHand';

export type StoryIconName = 'home' | 'play' | 'practice' | 'stars' | 'sound' | 'back' | 'next' | 'skip' | 'menu' | 'close';

export function StoryIcon({ name, muted = false }: { name: StoryIconName; muted?: boolean }) {
  if (name === 'play' || name === 'practice') return <span className="story-icon story-hand-parts" aria-hidden="true">
    {name === 'play' ? <><PikiHand decorative gesture="ROCK"/><PikiHand decorative gesture="SCISSORS"/><PikiHand decorative gesture="PAPER"/></> : <PikiHand decorative gesture="SCISSORS"/>}
  </span>;
  return <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" className="story-icon" fill="none" stroke="#70472f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    {name === 'home' && <><path fill="#f7b7b0" d="M13 44 48 14l35 30"/><path fill="#ffedbd" d="M23 39v41h50V39L48 19Z"/><path fill="#b9dcce" d="M40 80V57h17v23"/><path fill="#c9e4f3" d="M29 43h10v10H29Z"/></>}
    {name === 'stars' && <><path fill="#f6c1cd" d="M29 38 22 75q26 19 52 0l-7-37Z"/><path fill="#ffe08b" d="m48 12 9 18 20 3-15 15 4 21-18-10-18 10 4-21-15-15 20-3Z"/></>}
    {name === 'sound' && <><path fill="#fbd89d" d="M17 37h17l21-18v58L34 59H17Z"/>{muted ? <path d="m68 36 17 24m0-24L68 60"/> : <><path d="M67 33q14 15 0 30"/><path d="M77 22q24 26 0 52"/></>}</>}
    {(name === 'back' || name === 'next') && <path transform={name === 'next' ? 'translate(96 0) scale(-1 1)' : undefined} fill="#c6dfc9" d="M48 17 14 48l34 31V60h32V36H48Z"/>}
    {name === 'skip' && <><path fill="#c7ddf0" d="m16 23 28 25-28 25Zm29 0 28 25-28 25Z"/><path d="M81 23v50"/></>}
    {name === 'menu' && <><rect x="16" y="16" width="64" height="64" rx="25" fill="#ffedbd"/>{[32,48,64].map(y => <path key={y} d={`M32 ${y}h32`}/>)}</>}
    {name === 'close' && <><circle cx="48" cy="48" r="32" fill="#f4c0c4"/><path d="m35 35 26 26m0-26L35 61"/></>}
  </svg>;
}

type Destination = 'home' | 'play' | 'practice' | 'stars';
export function StoryNavigation({ soundEnabled, onSound, onNavigate }: {
  soundEnabled: boolean; onSound: () => void; onNavigate: (destination: Destination) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => () => dialog.current?.close(), []);
  const items: { id: Destination; label: string }[] = [
    { id: 'home', label: '처음으로' }, { id: 'play', label: '놀이 선택' },
    { id: 'practice', label: '규칙 연습' }, { id: 'stars', label: '내 별' },
  ];
  return <div className="story-navigation">
    <button ref={trigger} type="button" className="story-round-button" aria-label="메뉴 열기" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><StoryIcon name="menu" /></button>
    <dialog ref={dialog} className="story-menu-dialog" aria-label="피키 메뉴" onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }} onClose={() => trigger.current?.focus()}>
      <button type="button" className="story-round-button story-menu-close" aria-label="메뉴 닫기" onClick={() => dialog.current?.close()}><StoryIcon name="close"/></button>
      <nav className="story-menu-cards" aria-label="이동 메뉴">
        {items.map(item => <button type="button" key={item.id} onClick={() => { dialog.current?.close(); onNavigate(item.id); }}><StoryIcon name={item.id}/><span>{item.label}</span></button>)}
        <button type="button" aria-label={soundEnabled ? '소리 끄기' : '소리 켜기'} aria-pressed={soundEnabled} onClick={onSound}><StoryIcon name="sound" muted={!soundEnabled}/><span>{soundEnabled ? '소리 켜짐' : '소리 꺼짐'}</span></button>
      </nav>
    </dialog>
  </div>;
}
