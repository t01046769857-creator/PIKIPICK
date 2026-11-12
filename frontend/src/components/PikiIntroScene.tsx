import { useCallback, useEffect, useRef, useState } from 'react';
import playgroundBackground from '../assets/backgrounds/piki-playground-intro-background.png';
import { pikiExpressions, type PikiExpression } from '../assets/characters/piki/assetMap';
import playStartBody from '../assets/characters/piki/intro-layers/piki-intro-play-start-body.png';
import playStartHand from '../assets/characters/piki/intro-layers/piki-intro-play-start-hand.png';
import { BrandLogo } from './BrandLogo';
import { PikiSpeechBubble } from './PikiSpeechBubble';

type IntroPhase = 'PEEK' | 'LOOK' | 'NOTICE' | 'APPROACH' | 'REACH' | 'IDLE';
type StoryExpression = Extract<PikiExpression, 'introPeekRight' | 'surprised' | 'basicGreeting'>;

const invitation = '나랑 같이 놀자!';
// ★ 인트로는 한 번만 진행한다. 각 숫자는 다음 장면으로 넘어가기 전 머무는 시간(ms)이다.
const phaseDuration: Record<Exclude<IntroPhase, 'IDLE'>, number> = {
  PEEK: 700,
  LOOK: 800,
  NOTICE: 500,
  APPROACH: 1350,
  REACH: 700,
};
const nextPhase: Record<Exclude<IntroPhase, 'IDLE'>, IntroPhase> = {
  PEEK: 'LOOK', LOOK: 'NOTICE', NOTICE: 'APPROACH', APPROACH: 'REACH', REACH: 'IDLE',
};
const storyExpressionFor: Record<IntroPhase, StoryExpression> = {
  PEEK: 'introPeekRight',
  LOOK: 'introPeekRight',
  NOTICE: 'surprised',
  APPROACH: 'basicGreeting',
  REACH: 'basicGreeting',
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

/**
 * ★ 피키 인트로
 *
 * 하나의 무대 컨테이너를 유지한 채 표정 프레임을 바꾸고,
 * 마지막에는 손 내밀기 레이어를 보여 준다.
 * 관련 문서: docs/features/FEATURE-001_피키_손_터치_놀이_시작.md
 */
export function PikiIntroScene({ onBegin }: PikiIntroSceneProps) {
  const [phase, setPhase] = useState<IntroPhase>('PEEK');
  const [assetsReady, setAssetsReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [storyFrames, setStoryFrames] = useState<{ current: StoryExpression; previous: StoryExpression | null }>({ current: 'introPeekRight', previous: null });
  const hasSpoken = useRef(false);
  const isBeginning = useRef(false);
  const leaveTimer = useRef<number | null>(null);
  const storyFrameRef = useRef<StoryExpression>('introPeekRight');

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
    // 전환 전에 필요한 PNG를 모두 받아 이미지 디코딩으로 인한 첫 프레임 깜빡임을 줄인다.
    let cancelled = false;
    const requiredSources = [
      pikiExpressions.surprised,
      pikiExpressions.basicGreeting,
      pikiExpressions.introPeekRight,
      pikiExpressions.introReach,
      playStartBody,
      playStartHand,
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
    if (phase === 'IDLE') hasSpoken.current = false;
    if (phase === 'IDLE' && soundEnabled) speakInvitation();
  }, [phase, soundEnabled, speakInvitation]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
  }, []);

  const enableSound = () => {
    setSoundEnabled(true);
    if (phase === 'IDLE') {
      hasSpoken.current = false;
      speakInvitation();
    }
  };
  const beginPlay = () => {
    // 손을 빠르게 여러 번 눌러도 화면 전환은 한 번만 실행한다.
    if (isBeginning.current) return;
    isBeginning.current = true;
    setIsLeaving(true);
    leaveTimer.current = window.setTimeout(onBegin, reducedMotion ? 0 : 460);
  };

  const bubbleVisible = phase === 'IDLE';
  return (
    <main className={`piki-intro intro-v2 ${isSpeaking ? 'intro-v2--speaking' : ''} ${isLeaving ? 'intro-v2--leaving' : ''}`} data-phase={phase}>
      <img className="intro-playground-background" src={playgroundBackground} alt="" aria-hidden="true" />
      <header className="intro-topbar">
        <div className="intro-brand"><BrandLogo variant="intro" /></div>
        <button className="intro-sound" type="button" onClick={enableSound} disabled={soundEnabled}>{soundEnabled ? '소리 켜짐' : '소리 켜기'}</button>
      </header>

      <section className="intro-v2-stage" aria-label="피키의 놀이 초대 화면">
        <div className="intro-v2-safe">
          <div className="intro-v2-motion">
            <div className="intro-v2-hop">
              <div className="intro-v2-character">
                <div className="intro-story-stack" aria-hidden="true">
                  {storyFrames.previous && <img className={`intro-story-frame intro-story-frame--previous intro-story-frame--${storyFrames.previous}`} src={pikiExpressions[storyFrames.previous]} alt="" draggable="false" />}
                  <img className={`intro-story-frame intro-story-frame--current intro-story-frame--${storyFrames.current}`} src={pikiExpressions[storyFrames.current]} alt="" draggable="false" />
                  {phase === 'LOOK' && <span className="intro-peek-blink" aria-hidden="true" />}
                </div>
                <div className="intro-reach-assembly" aria-hidden={phase !== 'REACH' && phase !== 'IDLE'}>
                  <img className="intro-reach-body" src={playStartBody} alt="피키가 손을 내밀고 있어요" draggable="false" />
                  <div className={`play-start-hand ${phase === 'IDLE' && !isLeaving ? 'is-inviting' : ''}`}>
                    <img src={playStartHand} alt="" draggable="false" />
                    {/* 보이는 왼쪽 큰 손과 같은 좌표계의 투명 버튼: 손 자체를 누르는 경험을 만든다. */}
                    {(phase === 'REACH' || phase === 'IDLE') && <button className="play-start-hand__target" type="button" onClick={beginPlay} aria-label="피키 손을 눌러 놀이 시작" />}
                  </div>
                  {phase === 'IDLE' && !isLeaving && <div className="intro-hand-cue" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i><span>피키 손을 잡아줘!</span></div>}
                </div>
              </div>
            </div>
            {bubbleVisible && <PikiSpeechBubble>{invitation}</PikiSpeechBubble>}
          </div>
        </div>
      </section>

      <footer className="intro-footer">
        <p>{soundEnabled ? '브라우저 음성으로 피키가 말을 걸어요.' : '소리를 켜면 피키의 인사를 들을 수 있어요.'}</p>
      </footer>
    </main>
  );
}
