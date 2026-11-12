import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { PikiCharacter } from './components/PikiCharacter';
import { PikiIntroScene } from './components/PikiIntroScene';
import { SuccessStars } from './components/SuccessStars';
import { BrandLogo } from './components/BrandLogo';
import { GameRulePractice } from './components/GameRulePractice';
import { PikiOpponent } from './components/PikiOpponent';
import { PikiHand } from './components/PikiHand';
import { feedback } from './game/feedback';
import { inputFromButton } from './game/input';
import { installMetricsDevtools, recordMetric } from './game/metrics';
import { gameReducer, initialState, type GameAction, type GameState } from './game/reducer';
import { StoryIcon, StoryNavigation } from './components/StoryNavigation';
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
const devMode = import.meta.env.DEV;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState, (baseState) => {
    const savedRecords = readSavedRecords();
    return savedRecords ? { ...baseState, ...savedRecords } : baseState;
  });
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const navigationHistory = useRef<Pick<GameState, 'phase' | 'mode' | 'opponent' | 'result'>[]>([]);
  const measuredInputId = useRef(0);
  const measuredAdvanceId = useRef(0);
  const feedbackTimer = useRef<number | null>(null);
  const gameScreen = state.phase === 'PLAYING' || state.phase === 'RESULT';
  const partyMoment = state.phase === 'RESULT' && state.result?.success === true && state.successCount > 0 && state.successCount % 5 === 0;

  useEffect(() => {
    if (devMode) installMetricsDevtools();
  }, []);

  useEffect(() => {
    saveRecords(state);
  }, [state.successCount, state.partyCount]);

  useEffect(() => {
    if (state.phase !== 'PLAYING' || !soundEnabled) return undefined;
    return playChoiceRhythm();
  }, [state.phase, state.roundId, soundEnabled]);

  useEffect(() => {
    if (state.phase !== 'RESULT') return undefined;
    // 결과를 읽을 시간을 준 뒤 성공은 새 문제, 실패는 같은 문제로 자동 진행한다.
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
    if (!partyMoment || !soundEnabled) return undefined;
    return playCelebrationChime();
  }, [partyMoment, soundEnabled]);

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

  // 버튼과 향후 AI 입력은 모두 GameInput으로 통일해 같은 reducer 규칙을 통과한다.
  const submitInput = (input: GameInput) => dispatch({ type: 'SUBMIT_INPUT', input, requestedAt: devMode ? performance.now() : undefined });
  const clearRecords = () => {
    dispatch({ type: 'CLEAR_RECORDS' });
    setConfirmingReset(false);
  };

  const navigate = (action: GameAction) => {
    navigationHistory.current.push({ phase: state.phase, mode: state.mode, opponent: state.opponent, result: state.result });
    setConfirmingReset(false);
    dispatch(action);
  };
  const goBack = () => {
    setConfirmingReset(false);
    const screen = navigationHistory.current.pop();
    if (screen) dispatch({ type: 'RESTORE_SCREEN', screen });
    else dispatch({ type: 'RESTART' });
  };
  const navigation = <StoryNavigation soundEnabled={soundEnabled} onSound={() => {
    if (soundEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSoundEnabled(value => !value);
  }} onNavigate={destination => {
    const phase = { home: 'START', play: 'MODE_SELECT', practice: 'RULE_PRACTICE', stars: 'RECORDS' } as const;
    if (phase[destination] !== state.phase) navigate({ type: 'NAVIGATE', phase: phase[destination] });
  }}/>;

  if (state.phase === 'START') return <PikiIntroScene soundEnabled={soundEnabled} navigation={navigation} onBegin={() => navigate({ type: 'BEGIN' })} />;

  const resultMessage = state.result
    ? (state.result.success ? feedback.success : feedback.retry)[state.roundId % (state.result.success ? feedback.success.length : feedback.retry.length)]
    : '';

  return <main className={`app-shell app-shell--game-flow ${gameScreen ? 'app-shell--game' : ''}`}>
    <header className="topbar">
      <div className="app-brand"><BrandLogo /><h1>피키와 가위바위보</h1></div>
      <div className="game-header-tools">
        <SuccessStars count={state.successCount} partyCount={state.partyCount} roundId={state.roundId} celebrating={partyMoment} />
        {navigation}
      </div>
    </header>

    <div className="story-back-row"><button type="button" className="story-round-button" aria-label="이전 화면" onClick={goBack}><StoryIcon name="back"/></button></div>
    <section className={`play-card ${gameScreen ? 'play-card--game' : ''}`}>
      {state.phase === 'RECORDS' && <div className="story-records">
        <StoryIcon name="stars"/><h2>내 별</h2>
        <dl><div><dt>모은 별</dt><dd>{state.successCount}</dd></div><div><dt>별 파티</dt><dd>{state.partyCount}</dd></div></dl>
        <button type="button" className="secondary-action" onClick={() => setConfirmingReset(true)}>기록 설정</button>
      </div>}
      {state.phase === 'MODE_SELECT' && <div className="center-panel">
        <PikiCharacter expression="curious" size="medium" />
        <h2>어떤 놀이를 할까?</h2>
        <div className="mode-grid">
          {modes.map(mode => <button type="button" className="mode-card" key={mode.id} aria-label={`${mode.title}: ${mode.description}`} onClick={() => navigate({ type: 'SELECT_MODE', mode: mode.id })}>
            <span className="mode-card-art" aria-hidden="true">
              <PikiHand decorative gesture={mode.id === 'WIN' ? 'PAPER' : mode.id === 'LOSE' ? 'ROCK' : 'SCISSORS'}/>
              <PikiHand decorative gesture={mode.id === 'DRAW' ? 'SCISSORS' : mode.id === 'WIN' ? 'ROCK' : 'PAPER'}/>
            </span>
            <strong>{mode.title}</strong>
          </button>)}
          <button type="button" className="mode-card" aria-label="규칙 연습: 손 그림을 누르며 배워 보자!" onClick={() => navigate({ type: 'OPEN_RULE_PRACTICE' })}><span className="mode-card-art" aria-hidden="true"><PikiHand decorative gesture="ROCK"/><PikiHand decorative gesture="SCISSORS"/><PikiHand decorative gesture="PAPER"/></span><strong>규칙 연습</strong></button>
        </div>
      </div>}

      {state.phase === 'RULE_PRACTICE' && <GameRulePractice
        onComplete={() => { navigate({ type: 'NAVIGATE', phase: 'MODE_SELECT' }); }} />}

      {gameScreen && <div className="game-panel">
        <div className="opponent-area">
          <PikiOpponent key={state.celebrationId} gesture={state.opponent} celebrating={partyMoment}
            result={state.phase === 'RESULT' ? (state.result?.success ? 'success' : 'retry') : undefined}/>
          {state.phase === 'RESULT' && <div className={`piki-feedback ${state.result?.success ? 'success' : 'retry'}`} role="status" aria-live="polite">
            {partyMoment && <span className="party-banner">★ 별 5개 완성! 피키 파티! ★</span>}
            <h2>{resultMessage}</h2>
            <p>{state.result?.success ? '별 하나를 받았어요!' : '다시 골라 볼까요?'}</p>
          </div>}
        </div>
        <div className={`player-choice ${state.phase === 'PLAYING' ? 'player-choice--waiting' : ''}`}>
          <div className="gesture-grid" aria-label="가위바위보 선택">
            {gestures.map(gesture => <button key={gesture} disabled={state.phase === 'RESULT'} className={`gesture-button gesture-button--${gesture.toLowerCase()}`} onClick={() => submitInput(inputFromButton(gesture))}>
              <span className="gesture-icon" aria-hidden="true"><PikiHand gesture={gesture} decorative/></span>
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
