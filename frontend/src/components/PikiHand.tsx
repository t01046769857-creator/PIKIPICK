import { pikiHands } from '../assets/characters/piki/assetMap';
import { gestureLabel } from '../game/rules';
import type { Gesture } from '../game/types';
import './PikiHand.css';

export function PikiHand({ gesture, label, decorative = false }: {
  gesture: Gesture; label?: string; decorative?: boolean;
}) {
  return <img className="piki-hand" src={pikiHands[gesture]} width="1024" height="1024"
    data-gesture={gesture} alt={decorative ? '' : label ?? `${gestureLabel[gesture]} 손동작`}
    aria-hidden={decorative || undefined} draggable="false" />;
}
