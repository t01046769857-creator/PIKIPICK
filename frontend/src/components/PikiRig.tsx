import { useEffect, useState } from 'react';
import { pikiIntroFrames, pikiRigAssets } from '../assets/characters/piki/assetMap';

export type PikiRigPose = 'enter' | 'notice' | 'approach' | 'reach' | 'talk' | 'invite' | 'idle';

interface PikiRigProps {
  pose: PikiRigPose;
  speaking?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

/** Hybrid rig: independent transparent layers for the intro scene. */
export function PikiRig({ pose, speaking = false, reducedMotion = false, className = '' }: PikiRigProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [bridgeFrame, setBridgeFrame] = useState<'reach' | 'talk' | null>(null);
  const isTalking = speaking || pose === 'talk';

  useEffect(() => {
    if (reducedMotion) return undefined;
    const blink = () => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 140);
    };
    const timer = window.setInterval(blink, 2800);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isTalking || reducedMotion) {
      setMouthOpen(false);
      return undefined;
    }
    setMouthOpen(true);
    const timer = window.setInterval(() => setMouthOpen((current) => !current), 170);
    return () => window.clearInterval(timer);
  }, [isTalking, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || (pose !== 'reach' && pose !== 'talk')) return undefined;
    setBridgeFrame(pose);
    const timer = window.setTimeout(() => setBridgeFrame(null), 230);
    return () => window.clearTimeout(timer);
  }, [pose, reducedMotion]);

  return (
    <div className={`piki-rig piki-rig--${pose} ${isTalking ? 'piki-rig--talking' : ''} ${className}`} aria-label="손을 내밀고 인사하는 피키" role="img">
      {bridgeFrame && <img className="piki-rig__frame-bridge" src={pikiIntroFrames[bridgeFrame]} alt="" draggable="false" />}
      <img className="piki-rig__body" src={pikiRigAssets.body} alt="" draggable="false" />
      <div className="piki-rig__arm piki-rig__arm--reach" aria-hidden="true"><img src={pikiRigAssets.armReach} alt="" draggable="false" /></div>
      <div className="piki-rig__head-motion" aria-hidden="true">
        <span className="piki-rig__face-fill" />
        <img className="piki-rig__head-shell" src={pikiRigAssets.headShell} alt="" draggable="false" />
        <span className="piki-rig__face">
          <img className={`piki-rig__eyes piki-rig__eyes--open ${isBlinking ? 'is-hidden' : ''}`} src={pikiRigAssets.eyesOpen} alt="" draggable="false" />
          <img className={`piki-rig__eyes piki-rig__eyes--blink ${isBlinking ? 'is-visible' : ''}`} src={pikiRigAssets.eyesBlink} alt="" draggable="false" />
          <img className={`piki-rig__mouth piki-rig__mouth--closed ${mouthOpen ? 'is-hidden' : ''}`} src={pikiRigAssets.mouthClosed} alt="" draggable="false" />
          <img className={`piki-rig__mouth piki-rig__mouth--open ${mouthOpen ? 'is-visible' : ''}`} src={pikiRigAssets.mouthOpen} alt="" draggable="false" />
        </span>
      </div>
      <div className="piki-rig__arm piki-rig__arm--wave" aria-hidden="true"><img src={pikiRigAssets.armWave} alt="" draggable="false" /></div>
    </div>
  );
}
