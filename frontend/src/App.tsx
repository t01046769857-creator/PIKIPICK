import { useReducer } from 'react';
import { feedback } from './game/feedback';
import { gameReducer, initialState } from './game/reducer';
import { gestureLabel } from './game/rules';
import type { GameInput, GameMode, Gesture } from './game/types';
import { SuccessStars } from './components/SuccessStars';
import './styles.css';

const modes: { id: GameMode; title: string; description: string }[] = [
  { id: 'WIN', title: '이기기', description: '피키를 이겨 보자!' }, { id: 'LOSE', title: '지기', description: '피키에게 져 보자!' }, { id: 'DRAW', title: '비기기', description: '피키와 똑같이 내 보자!' },
];
const gestures: Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
const pickMessage = (items: readonly string[]) => items[Math.floor(Math.random() * items.length)];

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const modeName = state.mode ? feedback.modes[state.mode] : '';
  const submit = (gesture: Gesture) => { const input: GameInput = { gesture, source: 'BUTTON' }; dispatch({ type: 'SUBMIT_INPUT', input }); };
  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">PIKIPICK</p><h1>손동작 놀이</h1></div><SuccessStars count={state.successCount} /></header>
    <section className="play-card">
      {state.phase === 'START' && <div className="center-panel"><div className="character-placeholder">피키<br /><small>캐릭터 자리</small></div><h2>피키픽에 온 걸 환영해!</h2><p>내가 하고 싶은 놀이를 골라서 시작해 보자.</p><button className="primary" onClick={() => dispatch({ type: 'BEGIN' })}>놀이 시작하기</button></div>}
      {state.phase === 'MODE_SELECT' && <div className="center-panel"><h2>어떤 놀이를 할까?</h2><div className="mode-grid">{modes.map(mode => <button className="mode-card" key={mode.id} onClick={() => dispatch({ type: 'SELECT_MODE', mode: mode.id })}><strong>{mode.title}</strong><span>{mode.description}</span></button>)}<div className="mode-card disabled"><strong>청개구리</strong><span>준비 중이에요</span></div></div></div>}
      {state.phase === 'INSTRUCTION' && <div className="center-panel"><span className="pill">{modeName}</span><h2>규칙을 확인해 보자</h2><p>{state.mode === 'WIN' ? '피키가 낸 손동작을 이기는 손을 내면 성공!' : state.mode === 'LOSE' ? '피키가 낸 손동작에 지는 손을 내면 성공!' : '피키가 낸 손동작과 같은 손을 내면 성공!'}</p><button className="primary" onClick={() => dispatch({ type: 'TO_READY' })}>알겠어!</button></div>}
      {state.phase === 'READY' && <div className="center-panel"><span className="pill">{modeName}</span><div className="character-placeholder">피키</div><h2>준비됐으면 시작!</h2><button className="primary" onClick={() => dispatch({ type: 'START_ROUND' })}>문제 시작하기</button></div>}
      {(state.phase === 'PLAYING' || state.phase === 'RESULT') && <div className="game-panel"><div className="round-heading"><span className="pill">{modeName}</span><span>문제 {state.roundId}</span></div><div className="opponent-area"><div className="character-placeholder small">피키</div><p>피키의 손동작</p><strong>{state.opponent ? gestureLabel[state.opponent] : '…'}</strong></div><p className="choose-label">내 손동작을 골라 보자</p><div className="gesture-grid">{gestures.map(gesture => <button key={gesture} disabled={state.phase === 'RESULT'} className="gesture-button" onClick={() => submit(gesture)}><span>{gesture === 'ROCK' ? '✊' : gesture === 'SCISSORS' ? '✌️' : '🖐️'}</span>{gestureLabel[gesture]}</button>)}</div>{state.phase === 'RESULT' && <div className={`result-box ${state.result?.success ? 'success' : 'retry'}`}><h2>{state.result?.success ? pickMessage(feedback.success) : pickMessage(feedback.retry)}</h2><p>피키: {state.result ? gestureLabel[state.result.opponent] : ''} · 나: {state.result ? gestureLabel[state.result.player] : ''}</p><button className="primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>다음 문제</button></div>}</div>}
    </section>
    {state.phase !== 'START' && <button className="restart" onClick={() => dispatch({ type: 'RESTART' })}>처음부터 다시 시작</button>}
  </main>;
}
