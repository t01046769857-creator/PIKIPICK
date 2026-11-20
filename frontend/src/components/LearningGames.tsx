import { useEffect, useMemo, useState } from 'react';
import { PikiHand } from './PikiHand';
import { PikiCharacter } from './PikiCharacter';
import type { Gesture } from '../game/types';
import { chooseLearningLevel, readLearningProgress, saveLearningProgress, suggestNextLevel, updateLearningProgress } from '../game/learning/storage';
import type { LearningGameId, LearningLevelConfig, LearningProgress } from '../game/learning/types';
import { createMukProblem, correctMukChoice, gestureName, judgeMukProblem, mukLevels, type MukProblem } from '../game/learning/mukJjiPpa';
import { createCountingProblem, countingLevels, isCountingAnswer, type CountingProblem } from '../game/learning/counting';
import { createNumberProblem, isNumberAnswer, numberLevels, type NumberProblem } from '../game/learning/numbers';
import { createPatternProblem, isPatternAnswer, patternLevels, type PatternProblem, type PatternSymbol } from '../game/learning/patterns';
import './LearningGames.css';

interface LearningGamesProps { gameId: LearningGameId; onBack: () => void; }
type LearningProblem = MukProblem | CountingProblem | NumberProblem | PatternProblem;

const gameTitles: Record<LearningGameId, { title: string; subtitle: string; levels: readonly LearningLevelConfig[] }> = {
  MUK_JJI_PPA: { title: '묵찌빠', subtitle: '손을 내고, 공격권의 규칙을 찾아봐요.', levels: mukLevels },
  COUNTING: { title: '수 세기 놀이', subtitle: '사물을 톡톡 눌러 보고 몇 개인지 찾아봐요.', levels: countingLevels },
  NUMBER: { title: '숫자 놀이', subtitle: '숫자의 순서와 관계를 눈으로 살펴봐요.', levels: numberLevels },
  PATTERN: { title: '패턴·순서 놀이', subtitle: '그림이 이어지는 약속을 찾아봐요.', levels: patternLevels },
};

const gestures: readonly Gesture[] = ['ROCK', 'SCISSORS', 'PAPER'];
const gestureLabels: Record<Gesture, string> = { ROCK: '바위', SCISSORS: '가위', PAPER: '보' };
const patternLabels: Record<PatternSymbol, string> = { '●': '동그라미', '■': '네모', '▲': '세모', '★': '별' };

function problemFor(gameId: LearningGameId, level: number, index: number): LearningProblem {
  if (gameId === 'MUK_JJI_PPA') return createMukProblem(level, index);
  if (gameId === 'COUNTING') return createCountingProblem(level, index);
  if (gameId === 'NUMBER') return createNumberProblem(level, index);
  return createPatternProblem(level, index);
}

function LevelPicker({ config, currentLevel, onSelect }: { config: readonly LearningLevelConfig[]; currentLevel: number; onSelect: (level: number) => void }) {
  return <div className="learning-level-picker" aria-label="단계 고르기">
    {config.map(level => <button key={level.id} type="button" className={level.id === currentLevel ? 'is-selected' : ''} onClick={() => onSelect(level.id)} aria-label={`${level.id}단계 ${level.title}`}>
      <span>{level.id}</span><small>{level.title}</small>
    </button>)}
  </div>;
}

function LearningFeedback({ message, correct, onNext, nextLevelAvailable, onNextLevel }: { message: string; correct: boolean; onNext: () => void; nextLevelAvailable: boolean; onNextLevel: () => void }) {
  return <div className={`learning-feedback ${correct ? 'is-correct' : 'is-retry'}`} role="status" aria-live="polite">
    <PikiCharacter expression={correct ? 'successHappy' : 'encourage'} size="small" />
    <strong>{correct ? '잘 찾아냈어요!' : '괜찮아요. 다시 살펴봐요.'}</strong>
    <span>{message}</span>
    <div className="learning-feedback__actions">
      <button type="button" className="primary" onClick={onNext}>다음 놀이</button>
      {nextLevelAvailable && <button type="button" className="secondary-action" onClick={onNextLevel}>다음 단계 제안 보기</button>}
    </div>
  </div>;
}

function MukGame({ problem, onAnswer, hint }: { problem: MukProblem; onAnswer: (choice: Gesture) => void; hint: boolean }) {
  const answer = correctMukChoice(problem);
  return <div className="learning-question learning-question--muk">
    <div className="learning-character-row"><span className="learning-character-bubble">피키가 낸 손: <strong>{gestureName(problem.opponent)}</strong></span><PikiHand gesture={problem.opponent} decorative /></div>
    <p className="learning-question__prompt">{problem.phase === 'MATCH' || problem.phase === 'DUEL' ? '같은 손을 내면 누가 이길까요?' : '피키의 손을 보고 이기는 손을 찾아요.'}</p>
    <p className="learning-attack-note">{problem.phase === 'RPS' ? '먼저 이기는 손부터 알아봐요.' : `공격권: ${problem.attacker === 'CHILD' ? '나' : '피키'}`}</p>
    {hint && <p className="learning-hint">힌트: {problem.phase === 'MATCH' || problem.phase === 'DUEL' ? `피키와 같은 ${gestureName(problem.opponent)}을(를) 골라요.` : `${gestureName(answer)}이(가) ${gestureName(problem.opponent)}을(를) 이겨요.`}</p>}
    <div className="learning-choice-grid learning-choice-grid--gestures">
      {gestures.map(gesture => <button key={gesture} type="button" className="learning-choice learning-choice--gesture" onClick={() => onAnswer(gesture)}><PikiHand gesture={gesture} decorative /><strong>{gestureLabels[gesture]}</strong></button>)}
    </div>
  </div>;
}

function CountingGame({ problem, selected, onToggle, onAnswer, hint }: { problem: CountingProblem; selected: Set<number>; onToggle: (id: number) => void; onAnswer: (value: number) => void; hint: boolean }) {
  return <div className="learning-question learning-question--counting">
    <p className="learning-question__prompt">사물이 모두 몇 개일까요?</p>
    <p className="learning-attack-note">{problem.usesHands ? '손가락으로 먼저 세어 보아도 좋아요.' : '사물을 하나씩 톡톡 눌러 보세요. 모두 누르지 않아도 답을 골라도 괜찮아요.'}</p>
    {problem.usesHands && <div className="counting-warmup-hand"><PikiHand gesture="PAPER" decorative /><span>손가락과 사물을 함께 세어 봐요</span></div>}
    {hint && <p className="learning-hint">힌트: 화면의 사물을 천천히 왼쪽부터 세어 봐요.</p>}
    <div className={`counting-items ${problem.items.length === 0 ? 'is-empty' : ''}`} aria-label={`${problem.target}개의 사물`}>
      {problem.items.length === 0 ? <span>아무것도 없어요 · 0</span> : problem.items.map(item => <button key={item.id} type="button" className={selected.has(item.id) ? 'is-selected' : ''} style={{ left: `${item.x}%`, top: `${item.y}%`, backgroundColor: item.color }} onClick={() => onToggle(item.id)} aria-label={`${item.id + 1}번째 사물${selected.has(item.id) ? ' 선택됨' : ''}`} />)}
    </div>
    <div className="learning-number-options" aria-label="개수 선택">
      {problem.options.map(value => <button key={value} type="button" className="learning-choice learning-choice--number" onClick={() => onAnswer(value)}>{value}</button>)}
    </div>
  </div>;
}

function NumberGame({ problem, onAnswer, hint }: { problem: NumberProblem; onAnswer: (value: number) => void; hint: boolean }) {
  const prompt = problem.kind === 'MISSING' ? `${problem.left}  ·  ?  ·  ${problem.right}` : problem.kind === 'COMPARE' ? `${problem.left}과 ${problem.right} 중 더 큰 수` : `${problem.left} ${problem.operator} ${problem.right}`;
  return <div className="learning-question learning-question--number">
    <p className="learning-question__prompt">{problem.kind === 'MISSING' ? '빠진 숫자를 찾아요.' : problem.kind === 'COMPARE' ? '더 큰 수를 찾아요.' : '그림을 보고 계산해 봐요.'}</p>
    <div className="number-equation" aria-label={prompt}>
      {problem.kind === 'ADD' || problem.kind === 'SUBTRACT' || problem.kind === 'MIXED' ? <><span className="number-counters">{'●'.repeat(problem.left)}</span><b>{problem.operator}</b><span className="number-counters">{'●'.repeat(problem.right)}</span><b>=</b><strong>?</strong></> : <><strong>{problem.left}</strong><b>{problem.kind === 'MISSING' ? ' ? ' : '  또는  '}</b><strong>{problem.right}</strong></>}
    </div>
    {hint && <p className="learning-hint">힌트: {problem.kind === 'COMPARE' ? '더 많이 있는 쪽을 찾아요.' : '숫자를 작은 것부터 차례로 살펴봐요.'}</p>}
    <div className="learning-number-options">{problem.options.map(value => <button key={value} type="button" className="learning-choice learning-choice--number" onClick={() => onAnswer(value)}>{value}</button>)}</div>
  </div>;
}

function PatternGame({ problem, onAnswer, hint }: { problem: PatternProblem; onAnswer: (value: PatternSymbol) => void; hint: boolean }) {
  return <div className="learning-question learning-question--pattern">
    <p className="learning-question__prompt">그림의 약속을 보고 빈칸을 채워요.</p>
    <div className="pattern-sequence" aria-label="패턴 순서">{problem.sequence.map((symbol, index) => <span key={`${symbol}-${index}`} className={symbol === '★' ? 'is-blank' : ''}>{symbol === '★' ? '?' : symbol}</span>)}</div>
    {hint && <p className="learning-hint">힌트: 앞에서부터 같은 순서가 반복되는지 찾아봐요.</p>}
    <div className="learning-choice-grid learning-choice-grid--pattern">{problem.options.map(symbol => <button key={symbol} type="button" className="learning-choice learning-choice--pattern" onClick={() => onAnswer(symbol)} aria-label={patternLabels[symbol]}>{symbol}</button>)}</div>
  </div>;
}

export function LearningGames({ gameId, onBack }: LearningGamesProps) {
  const game = gameTitles[gameId];
  const [progress, setProgress] = useState<LearningProgress>(() => readLearningProgress(gameId));
  const [problem, setProblem] = useState<LearningProblem>(() => problemFor(gameId, progress.currentLevel, progress.currentProblemIndex));
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [hint, setHint] = useState(false);
  const [touchEvents, setTouchEvents] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const next = readLearningProgress(gameId);
    setProgress(next);
    setProblem(problemFor(gameId, next.currentLevel, next.currentProblemIndex));
    saveLearningProgress(next);
  }, [gameId]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [problem.id]);

  const nextLevelAvailable = useMemo(() => suggestNextLevel(progress) && progress.currentLevel < game.levels.length, [game.levels.length, progress]);
  const recordAnswer = (correct: boolean, message: string) => {
    if (feedback) return;
    const next = updateLearningProgress(progress, {
      ruleId: problem.ruleId,
      correct,
      usedHint: hint,
      touchEvents,
      problem: { id: problem.id, level: problem.level, ruleId: problem.ruleId },
    });
    setProgress(next);
    saveLearningProgress(next);
    setFeedback({ correct, message });
  };

  const answerMuk = (choice: Gesture) => recordAnswer(judgeMukProblem(problem as MukProblem, choice), `다음에는 ${gestureName(correctMukChoice(problem as MukProblem))}도 살펴봐요.`);
  const answerCounting = (value: number) => {
    const counting = problem as CountingProblem;
    recordAnswer(isCountingAnswer(counting, value), `${counting.target}개의 사물을 찾았어요. 다시 세어도 괜찮아요.`);
  };
  const answerNumber = (value: number) => {
    const number = problem as NumberProblem;
    recordAnswer(isNumberAnswer(number, value), `정답은 ${number.answer}이에요. 숫자와 그림을 함께 봤어요.`);
  };
  const answerPattern = (value: PatternSymbol) => {
    const pattern = problem as PatternProblem;
    recordAnswer(isPatternAnswer(pattern, value), `다음 그림은 ${patternLabels[pattern.answer]}이에요.`);
  };

  const nextProblem = () => {
    setProblem(problemFor(gameId, progress.currentLevel, progress.currentProblemIndex));
    setSelectedItems(new Set());
    setFeedback(null);
    setHint(false);
    setTouchEvents(0);
  };
  const selectLevel = (level: number) => {
    const next = chooseLearningLevel(progress, level);
    setProgress(next);
    saveLearningProgress(next);
    setProblem(problemFor(gameId, next.currentLevel, next.currentProblemIndex));
    setSelectedItems(new Set());
    setFeedback(null);
    setHint(false);
    setTouchEvents(0);
  };
  const selectItem = (id: number) => {
    setSelectedItems(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setTouchEvents(value => value + 1);
  };

  return <section className="learning-games" aria-labelledby="learning-games-title">
    <header className="learning-games__heading">
      <span className="learning-games__eyebrow">천천히 찾아도 괜찮아요 · {elapsed}초</span>
      <h2 id="learning-games-title">{game.title}</h2>
      <p>{game.subtitle}</p>
      <div className="learning-progress-summary"><span>{progress.currentLevel}단계 · {progress.currentProblemIndex + 1}번째 놀이</span><span>혼자 찾아낸 답 {progress.correct}개</span></div>
    </header>
    <LevelPicker config={game.levels} currentLevel={progress.currentLevel} onSelect={selectLevel} />
    <div className="learning-games__tools"><button type="button" className="text-action" onClick={() => setHint(value => !value)}>{hint ? '힌트 닫기' : '도움 보기'}</button><span>노래가 끝나도 놀이는 계속돼요.</span></div>
    {!feedback && gameId === 'MUK_JJI_PPA' && <MukGame problem={problem as MukProblem} onAnswer={answerMuk} hint={hint} />}
    {!feedback && gameId === 'COUNTING' && <CountingGame problem={problem as CountingProblem} selected={selectedItems} onToggle={selectItem} onAnswer={answerCounting} hint={hint} />}
    {!feedback && gameId === 'NUMBER' && <NumberGame problem={problem as NumberProblem} onAnswer={answerNumber} hint={hint} />}
    {!feedback && gameId === 'PATTERN' && <PatternGame problem={problem as PatternProblem} onAnswer={answerPattern} hint={hint} />}
    {feedback && <LearningFeedback message={feedback.message} correct={feedback.correct} onNext={nextProblem} nextLevelAvailable={nextLevelAvailable} onNextLevel={() => selectLevel(progress.currentLevel + 1)} />}
    <div className="learning-games__footer"><button type="button" className="secondary-action" onClick={onBack}>놀이 고르기로</button></div>
  </section>;
}
