import { useCallback, useEffect, useRef, useState } from 'react';
import { PikiCharacter } from './PikiCharacter';

type IntroPhase = 'peek' | 'approach' | 'reach' | 'talk' | 'invite';

const invitation = '야호! 나랑 같이 놀자!';
const phaseDuration: Record<Exclude<IntroPhase, 'invite'>, number> = {
  peek: 900,
  approach: 1700,
  reach: 850,
  talk: 2000,
};

interface PikiIntroSceneProps {
  onBegin: () => void;
}

export function PikiIntroScene({ onBegin }: PikiIntroSceneProps) {
  const [phase, setPhase] = useState<IntroPhase>('peek');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hasSpoken = useRef(false);

  const speakInvitation = useCallback(() => {
    if (!('speechSynthesis' in window) || hasSpoken.current) return;
    hasSpoken.current = true;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(invitation);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1.25;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReducedMotion(query.matches);
    syncMotionPreference();
    query.addEventListener('change', syncMotionPreference);
    return () => query.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase('invite');
      return;
    }
    if (phase === 'invite') return;
    const nextPhase: Record<Exclude<IntroPhase, 'invite'>, IntroPhase> = {
      peek: 'approach',
      approach: 'reach',
      reach: 'talk',
      talk: 'invite',
    };
    const timer = window.setTimeout(() => setPhase(nextPhase[phase]), phaseDuration[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase === 'talk') hasSpoken.current = false;
    if ((phase === 'talk' || phase === 'invite') && soundEnabled) speakInvitation();
  }, [phase, soundEnabled, speakInvitation]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const enableSound = () => {
    setSoundEnabled(true);
    if (phase === 'talk' || phase === 'invite') speakInvitation();
  };

  const skipToInvitation = () => {
    setPhase('invite');
  };

  const beginPlay = () => {
    setIsLeaving(true);
    window.setTimeout(onBegin, reducedMotion ? 0 : 460);
  };

  const expression = phase === 'talk' ? 'introTalk' : phase === 'reach' || phase === 'invite' ? 'introReach' : phase === 'approach' ? 'successHappy' : 'basicGreeting';
  const bubbleVisible = phase === 'talk' || phase === 'invite';

  return <main className={`piki-intro piki-intro--${phase} ${isSpeaking ? 'piki-intro--speaking' : ''} ${isLeaving ? 'piki-intro--leaving' : ''}`}>
    <div className="intro-sky" aria-hidden="true"><i /><i /><i /></div>
    <header className="intro-topbar">
      <div><p className="eyebrow">PIKIPICK</p><h1>피키와 손동작 놀이</h1></div>
      <button className="intro-sound" type="button" onClick={enableSound} disabled={soundEnabled}>
        {soundEnabled ? '소리 켜짐' : '소리 켜기'}
      </button>
    </header>

    <p className="intro-scene-copy" aria-live="polite">{phase === 'peek' ? '어? 누가 왔지?' : phase === 'approach' ? '피키가 통통 다가와요!' : phase === 'reach' ? '피키가 손을 내밀어요.' : invitation}</p>

    <section className="intro-stage" aria-label="피키의 놀이 초대 장면">
      <div className="intro-piki-track">
        <PikiCharacter expression={expression} size="large" className="intro-piki-figure" />
        {bubbleVisible && <div className="intro-speech-bubble" aria-live="polite"><span>{invitation}</span></div>}
        {phase === 'invite' && <div className="intro-game-icons" aria-hidden="true"><span>✊</span><span>✌️</span><span>🖐️</span></div>}
        {phase === 'invite' && <button className="intro-play-button" type="button" onClick={beginPlay}>같이 놀기!</button>}
      </div>
    </section>

    <footer className="intro-footer">
      {!soundEnabled && <p>소리를 켜면 피키가 직접 말을 걸어요. 소리가 없어도 말풍선으로 함께할 수 있어요.</p>}
      {soundEnabled && <p>브라우저 TTS를 사용해요. 기기에 한국어 음성이 없으면 말풍선만 표시될 수 있어요.</p>}
      {phase !== 'invite' && <button className="intro-skip" type="button" onClick={skipToInvitation}>장면 건너뛰기</button>}
    </footer>
  </main>;
}
