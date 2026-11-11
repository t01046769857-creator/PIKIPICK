import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { PikiCharacter } from './components/PikiCharacter';
import { PikiIntroScene } from './components/PikiIntroScene';
import { SuccessStars } from './components/SuccessStars';
import { feedback } from './game/feedback';
import { inputFromButton } from './game/input';
import { installMetricsDevtools, recordMetric } from './game/metrics';
import { gameReducer, initialState } from './game/reducer';
import { readSavedRecords, saveRecords } from './game/records';
import { gestureLabel } from './game/rules';
import { playCelebrationChime, playChoiceRhythm } from './game/rhythm';
import type { GameInput, GameMode, Gesture } from './game/types';
import './styles.css';

const modes: { id: GameMode; title: string; description: string }[] = [
  { id: 'WIN', title: '이기기', description: '피키를 이겨 보자!' },
  { id: 'LOSE', title: '지기', description: '피키에게 져 보자!' },
  { id: 'DRAW', title: '비기기', description: '피키와 똑같이 내 보자!' },
];
const gestures: Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
const gestureIcon: Record<Gesture, string> = { ROCK: '✊', SCISSORS: '✌️', PAPER: '✋' };
const devMode = import.meta.env.DEV;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState, (baseState) => {
    const savedRecords = readSavedRecords();
    return savedRecords ? { ...baseState, ...savedRecords } : baseState;
  });
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const measuredInputId = useRef(0);
  const measuredAdvanceId = useRef(0);
  const feedbackTimer = useRef<number | null>(null);
  const modeName = state.mode ? feedback.modes[state.mode] : '';
  const gameScreen = state.phase === 'PLAYING' || state.phase === 'RESULT';
  const partyMoment = state.phase === 'RESULT' && state.result?.success === true && state.successCount > 0 && state.successCount % 5 === 0;

  useEffect(() => {
    if (devMode) installMetricsDevtools();
  }, []);

  useEffect(() => {
    saveRecords(state);
  }, [state.successCount, state.partyCount]);

  useEffect(() => {
    if (state.phase !== 'PLAYING') return undefined;
    return playChoiceRhythm();
  }, [state.phase, state.roundId]);

  useEffect(() => {
    if (state.phase !== 'RESULT') return undefined;
    feedbackTimer.current = window.setTimeout(() => {
      const requestedAt = devMode ? performance.now() : undefined;
      dispatch(state.result?.success ? { type: 'NEXT_ROUND', requestedAt } : { type: 'RETRY_ROUND', requestedAt });
      feedbackTimer.current = null;
    }, 1700);
    return () => {
      if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    };
  }, [state.phase, state.inputSequence, state.result?.success]);

  useEffect(() => {
    if (!partyMoment) return undefined;
    return playCelebrationChime();
  }, [partyMoment]);

  useLayoutEffect(() => {
    const timing = state.lastInputTiming;
    if (!devMode || !timing || measuredInputId.current === timing.id || state.phase !== 'RESULT') return undefined;
    measuredInputId.current = timing.id;
    recordMetric('ruleDecision', timing.decidedAt - timing.startedAt);
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => recordMetric('resultPaint', performance.now() - timing.startedAt));
    });
    return () => { window.cancelAnimationFrame(firstFrame); window.cancelAnimationFrame(secondFrame); };
  }, [state.lastInputTiming, state.phase]);

  useLayoutEffect(() => {
    const timing = state.lastAdvanceTiming;
    if (!devMode || !timing || measuredAdvanceId.current === timing.id || state.phase !== 'PLAYING') return undefined;
    measuredAdvanceId.current = timing.id;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => recordMetric('roundAdvancePaint', performance.now() - timing.startedAt));
    });
    return () => { window.cancelAnimationFrame(firstFrame); window.cancelAnimationFrame(secondFrame); };
  }, [state.lastAdvanceTiming, state.phase]);

  const submitInput = (input: GameInput) => dispatch({ type: 'SUBMIT_INPUT', input, requestedAt: devMode ? performance.now() : undefined });
  const chooseAnotherMode = () => {
    setConfirmingReset(false);
    setMenuOpen(false);
    dispatch({ type: 'CHOOSE_ANOTHER_MODE' });
  };
  const clearRecords = () => {
    dispatch({ type: 'CLEAR_RECORDS' });
    setConfirmingReset(false);
    setMenuOpen(false);
  };

  if (state.phase === 'START') return <PikiIntroScene onBegin={() => dispatch({ type: 'BEGIN' })} />;

  const resultMessage = state.result
    ? (state.result.success ? feedback.success : feedback.retry)[state.roundId % (state.result.success ? feedback.success.length : feedback.retry.length)]
    : '';

  return <main className={`app-shell ${gameScreen ? 'app-shell--game' : ''}`}>
    <header className="topbar">
      <div><p className="eyebrow">PIKIPICK</p><h1>피키와 가위바위보</h1></div>
      <div className="game-header-tools">
        <SuccessStars count={state.successCount} partyCount={state.partyCount} roundId={state.roundId} celebrating={partyMoment} />
        {gameScreen && <div className="game-menu">
          <button type="button" className="game-menu-toggle" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>메뉴</button>
          {menuOpen && <div className="game-menu-panel">
            <button type="button" onClick={chooseAnotherMode}>다른 놀이</button>
            <button type="button" onClick={() => { setMenuOpen(false); setConfirmingReset(true); }}>기록 설정</button>
          </div>}
        </div>}
      </div>
    </header>

    <section className={`play-card ${gameScreen ? 'play-card--game' : ''}`}>
      {state.phase === 'MODE_SELECT' && <div className="center-panel">
        <PikiCharacter expression="curious" size="medium" />
        <h2>어떤 놀이를 할까?</h2>
        <div className="mode-grid">
          {modes.map(mode => <button className="mode-card" key={mode.id} onClick={() => dispatch({ type: 'SELECT_MODE', mode: mode.id })}>
            <strong>{mode.title}</strong><span>{mode.description}</span>
          </button>)}
          <div className="mode-card disabled"><strong>청개구리</strong><span>준비 중이에요</span></div>
        </div>
      </div>}

      {state.phase === 'INSTRUCTION' && <div className="center-panel">
        <PikiCharacter expression="playful" size="medium" />
        <span className="pill">{modeName}</span>
        <h2>규칙을 확인해 보자</h2>
        <p>{state.mode === 'WIN' ? '피키가 낸 손동작을 이기는 손을 내면 성공!' : state.mode === 'LOSE' ? '피키가 낸 손동작에 지는 손을 내면 성공!' : '피키가 낸 손동작과 같은 손을 내면 성공!'}</p>
        <button className="primary" onClick={() => dispatch({ type: 'TO_READY' })}>알겠어!</button>
      </div>}

      {state.phase === 'READY' && <div className="center-panel">
        <PikiCharacter expression="successHappy" size="medium" />
        <span className="pill">{modeName}</span>
        <h2>준비됐으면 시작!</h2>
        <p>피키의 손동작을 맞혀 보자.</p>
        <button className="primary" onClick={() => dispatch({ type: 'START_ROUND' })}>문제 시작하기</button>
      </div>}

      {gameScreen && <div className="game-panel">
        <div className="opponent-area">
          <div key={state.celebrationId} className={partyMoment ? 'piki-party-dance' : ''}>
            {state.phase === 'RESULT'
              ? <PikiCharacter expression={state.result?.success ? 'successHappy' : 'encourage'} size="large" />
              : <PikiCharacter gesture={state.opponent ?? undefined} expression="playful" size="large" />}
          </div>
          {state.phase === 'RESULT' && <div className={`piki-feedback ${state.result?.success ? 'success' : 'retry'}`} role="status" aria-live="polite">
            {partyMoment && <span className="party-banner">★ 별 5개 완성! 피키 파티! ★</span>}
            <h2>{resultMessage}</h2>
            <p>{state.result?.success ? '별 하나를 받았어요!' : '다시 골라 볼까요?'}</p>
          </div>}
        </div>
        <div className={`player-choice ${state.phase === 'PLAYING' ? 'player-choice--waiting' : ''}`}>
          <div className="gesture-grid" aria-label="가위바위보 선택">
            {gestures.map(gesture => <button key={gesture} disabled={state.phase === 'RESULT'} className={`gesture-button gesture-button--${gesture.toLowerCase()}`} onClick={() => submitInput(inputFromButton(gesture))}>
              <span className="gesture-icon" aria-hidden="true">{gestureIcon[gesture]}</span>
              <span>{gestureLabel[gesture]}</span>
            </button>)}
          </div>
        </div>
      </div>}
    </section>
    {confirmingReset && <div className="record-confirm" role="alertdialog" aria-modal="true" aria-label="기록 초기화 확인">
      <p>별과 성공 기록을 모두 지울까요?</p>
      <div><button type="button" className="secondary-action" onClick={() => setConfirmingReset(false)}>취소</button><button type="button" className="primary" onClick={clearRecords}>기록 지우기</button></div>
    </div>}
  </main>;
}
