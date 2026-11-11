import { useCallback, useEffect, useRef, useState } from 'react';
import { pikiExpressions, type PikiExpression } from '../assets/characters/piki/assetMap';
import { PikiBody, pikiIntroBodySource } from './PikiBody';
import { PikiReachHand, pikiIntroReachHandSource, type PikiReachHandState } from './PikiReachHand';
import { PikiSpeechBubble } from './PikiSpeechBubble';

type IntroPhase = 'PEEK' | 'NOTICE' | 'HOLD' | 'APPROACH' | 'SETTLE' | 'REACH' | 'TALK' | 'IDLE';
type StoryExpression = Extract<PikiExpression, 'curious' | 'surprised' | 'basicGreeting'>;

const invitation = '나랑 같이 놀자!';
const phaseDuration: Record<Exclude<IntroPhase, 'IDLE'>, number> = {
  PEEK: 950,
  NOTICE: 700,
  HOLD: 1000,
  APPROACH: 1450,
  SETTLE: 500,
  REACH: 720,
  TALK: 1200,
};
const nextPhase: Record<Exclude<IntroPhase, 'IDLE'>, IntroPhase> = {
  PEEK: 'NOTICE', NOTICE: 'HOLD', HOLD: 'APPROACH', APPROACH: 'SETTLE',
  SETTLE: 'REACH', REACH: 'TALK', TALK: 'IDLE',
};
const storyExpressionFor: Record<IntroPhase, StoryExpression> = {
  PEEK: 'curious',
  NOTICE: 'surprised',
  HOLD: 'surprised',
  APPROACH: 'basicGreeting',
  SETTLE: 'basicGreeting',
  REACH: 'basicGreeting',
  TALK: 'basicGreeting',
  IDLE: 'basicGreeting',
};

interface PikiIntroSceneProps {
  onBegin: () => void;
}

function preloadAndDecode(source: string): Promise<void> {
  return new Promise(resolve => {
    const image = new Image();
    const finish = () => resolve();
    image.onload = () => {
      if (typeof image.decode !== 'function') return finish();
      void image.decode().catch(() => undefined).finally(finish);
    };
    image.onerror = finish;
    image.src = source;
  });
}

function handStateFor(phase: IntroPhase): PikiReachHandState {
  if (phase === 'REACH' || phase === 'TALK') return 'reaching';
  return phase === 'IDLE' ? 'idle' : 'hidden';
}

/** Persistent canvas: story frames fade in place, then the reach assembly is revealed. */
export function PikiIntroScene({ onBegin }: PikiIntroSceneProps) {
  const [phase, setPhase] = useState<IntroPhase>('PEEK');
  const [assetsReady, setAssetsReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [storyFrames, setStoryFrames] = useState<{ current: StoryExpression; previous: StoryExpression | null }>({ current: 'curious', previous: null });
  const hasSpoken = useRef(false);
  const isBeginning = useRef(false);
  const leaveTimer = useRef<number | null>(null);
  const storyFrameRef = useRef<StoryExpression>('curious');

  const storyExpression = storyExpressionFor[phase];

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
    let cancelled = false;
    const requiredSources = [
      pikiExpressions.curious,
      pikiExpressions.surprised,
      pikiExpressions.basicGreeting,
      pikiIntroBodySource,
      pikiIntroReachHandSource,
    ];
    void Promise.all(requiredSources.map(preloadAndDecode)).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (storyFrameRef.current === storyExpression) return undefined;
    const previous = storyFrameRef.current;
    storyFrameRef.current = storyExpression;
    setStoryFrames({ current: storyExpression, previous });
    const fadeTimer = window.setTimeout(() => setStoryFrames(frames => ({ ...frames, previous: null })), reducedMotion ? 0 : 220);
    return () => window.clearTimeout(fadeTimer);
  }, [reducedMotion, storyExpression]);

  useEffect(() => {
    if (reducedMotion) {
      setPhase('IDLE');
      return undefined;
    }
    if (!assetsReady || phase === 'IDLE') return undefined;
    const timer = window.setTimeout(() => setPhase(nextPhase[phase]), phaseDuration[phase]);
    return () => window.clearTimeout(timer);
  }, [assetsReady, phase, reducedMotion]);

  useEffect(() => {
    if (phase === 'TALK') hasSpoken.current = false;
    if (phase === 'TALK' && soundEnabled) speakInvitation();
  }, [phase, soundEnabled, speakInvitation]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
  }, []);

  const enableSound = () => {
    setSoundEnabled(true);
    if (phase === 'TALK' || phase === 'IDLE') {
      hasSpoken.current = false;
      speakInvitation();
    }
  };
  const beginPlay = () => {
    if (isBeginning.current) return;
    isBeginning.current = true;
    setIsLeaving(true);
    leaveTimer.current = window.setTimeout(onBegin, reducedMotion ? 0 : 460);
  };

  const bubbleVisible = phase === 'TALK' || phase === 'IDLE';
  const handAvailable = phase === 'IDLE';

  return (
    <main className={`piki-intro intro-v2 ${isSpeaking ? 'intro-v2--speaking' : ''} ${isLeaving ? 'intro-v2--leaving' : ''}`} data-phase={phase}>
      <div className="intro-sky" aria-hidden="true"><i /><i /><i /></div>
      <header className="intro-topbar">
        <div><p className="eyebrow">PIKIPICK</p><h1>피키와 놀 시간!</h1></div>
        <button className="intro-sound" type="button" onClick={enableSound} disabled={soundEnabled}>{soundEnabled ? '소리 켜짐' : '소리 켜기'}</button>
      </header>

      <section className="intro-v2-stage" aria-label="피키의 놀이 초대 화면">
        <div className="intro-v2-safe">
          <div className="intro-v2-motion">
            <div className="intro-v2-hop">
              <div className="intro-v2-character" aria-label="아이에게 인사하는 피키" role="img">
                <div className="intro-story-stack" aria-hidden="true">
                  {storyFrames.previous && <img className="intro-story-frame intro-story-frame--previous" src={pikiExpressions[storyFrames.previous]} alt="" draggable="false" />}
                  <img className="intro-story-frame intro-story-frame--current" src={pikiExpressions[storyFrames.current]} alt="" draggable="false" />
                </div>
                <div className="intro-reach-assembly" aria-hidden={phase !== 'REACH' && phase !== 'TALK' && phase !== 'IDLE'}>
                  <PikiBody />
                  <PikiReachHand state={handStateFor(phase)} onGrab={beginPlay} />
                </div>
              </div>
            </div>
            {bubbleVisible && <PikiSpeechBubble>{invitation}</PikiSpeechBubble>}
            {handAvailable && <div className="intro-v2-icons" aria-hidden="true"><span>✊</span><span>✌️</span><span>✋</span></div>}
          </div>
        </div>
      </section>

      <footer className="intro-footer">
        <p>{soundEnabled ? '브라우저 음성으로 피키가 말을 걸어요.' : '소리를 켜면 피키의 인사를 들을 수 있어요.'}</p>
      </footer>
    </main>
  );
}
