import { useState } from 'react';
import { GAME_MODES, GESTURES, gestureLabel, isSuccessful } from '../game/rules';
import type { GameMode, Gesture } from '../game/types';
import { PikiCharacter } from './PikiCharacter';
import './GameRulePractice.css';
import { StoryIcon } from './StoryNavigation';
import { PikiHand } from './PikiHand';

const prompts: Record<GameMode, string> = {
  WIN: '피키를 이기는 손을 골라 봐!',
  LOSE: '피키에게 지는 손을 골라 봐!',
  DRAW: '피키와 똑같은 손을 골라 봐!',
};

const examples = GAME_MODES.flatMap(mode => GESTURES.map(opponent => ({ mode, opponent })));

export function GameRulePractice({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<number, Gesture>>>({});
  const { mode, opponent } = examples[step];
  const selected = answers[step];
  const correct = selected !== undefined && isSuccessful(mode, selected, opponent);

  return <div className="center-panel rule-practice">
    <button type="button" className="rule-practice-skip" onClick={onComplete} aria-label="규칙 연습 건너뛰기"><StoryIcon name="skip"/><span>건너뛰기</span></button>
    <h2>손 그림으로 규칙을 연습해 보자!</h2>
    <p>{prompts[mode]}</p>
    <div className="rule-practice-opponent">
      <PikiCharacter gesture={opponent} size="medium" />
      <span key={opponent} className="rule-practice-guide"><PikiHand gesture={opponent} label={`피키가 낸 ${gestureLabel[opponent]}`}/></span>
    </div>
    <p>피키는 <strong>{gestureLabel[opponent]}</strong>를 냈어!</p>
    <div className="rule-practice-choices" aria-label="연습 손동작 선택">
      {GESTURES.map(gesture => <button type="button" key={gesture}
        aria-pressed={selected === gesture}
        onClick={() => setAnswers(previous => ({ ...previous, [step]: gesture }))}>
        <span className="rule-practice-icon" aria-hidden="true"><PikiHand gesture={gesture} decorative/></span>
        <span>{gestureLabel[gesture]}</span>
      </button>)}
    </div>
    <p className="rule-practice-feedback" role="status" aria-live="polite">
      {selected === undefined ? '어떤 손을 내면 될까?' : correct ? '정답이야! 잘했어! 🌟' : '괜찮아! 다른 손을 골라 보자.'}
    </p>
    <nav className="rule-practice-navigation" aria-label="규칙 연습 이동">
      <button type="button" disabled={step === 0} onClick={() => setStep(value => value - 1)} aria-label="이전 연습"><StoryIcon name="back"/><span>이전</span></button>
      <span>{step + 1} / {examples.length}</span>
      <button type="button" disabled={!correct} onClick={() => {
        if (step === examples.length - 1) onComplete();
        else setStep(value => value + 1);
      }} aria-label={step === examples.length - 1 ? '연습 완료' : '다음 연습'}><StoryIcon name="next"/><span>{step === examples.length - 1 ? '완료' : '다음'}</span></button>
    </nav>
  </div>;
}
