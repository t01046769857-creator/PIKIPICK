import type { Gesture } from '../game/types';
import { gestureLabel } from '../game/rules';
import { PikiCharacter } from './PikiCharacter';
import { PikiHand } from './PikiHand';
import './PikiOpponent.css';

export function PikiOpponent({ gesture, result, celebrating }: {
  gesture: Gesture | null; result?: 'success' | 'retry'; celebrating: boolean;
}) {
  return <div className="piki-opponent">
    <div className={`piki-opponent-character ${celebrating ? 'piki-party-dance' : ''}`}>
      {result
        ? <PikiCharacter expression={result === 'success' ? 'successHappy' : 'encourage'} size="large" />
        : <PikiCharacter gesture={gesture ?? undefined} expression="playful" size="large" />}
    </div>
    {gesture && <div className="piki-opponent-move" key={gesture}>
      <PikiHand gesture={gesture} label={`피키가 낸 ${gestureLabel[gesture]}`}/><span>{gestureLabel[gesture]}</span>
    </div>}
  </div>;
}
