import handSource from '../assets/characters/piki/intro-layers/piki-intro-right-hand-reach.png';

export const pikiIntroReachHandSource = handSource;

export type PikiReachHandState = 'hidden' | 'reaching' | 'idle';

interface PikiReachHandProps {
  state: PikiReachHandState;
  onGrab: () => void;
}

/**
 * Registered screen-right hand layer. The transparent button only covers the
 * illustrated hand; it is not rendered as an additional UI control.
 */
export function PikiReachHand({ state, onGrab }: PikiReachHandProps) {
  return <div className={`piki-reach-hand piki-reach-hand--${state}`}>
    <img className="piki-reach-hand__art" src={pikiIntroReachHandSource} alt="" draggable="false" />
    {state === 'idle' && <button className="piki-reach-hand__target" type="button" onClick={onGrab} aria-label="피키의 내민 손을 잡고 놀이 시작하기" />}
  </div>;
}
