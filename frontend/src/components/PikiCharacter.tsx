import type { CSSProperties } from 'react';
import { pikiAssetLabels, pikiExpressions, pikiGestures, type PikiExpression, type PikiGesture } from '../assets/characters/piki/assetMap';

interface PikiCharacterProps { expression?: PikiExpression; gesture?: PikiGesture; size?: 'small' | 'medium' | 'large'; className?: string; }

export function PikiCharacter({ expression = 'basicGreeting', gesture, size = 'medium', className = '' }: PikiCharacterProps) {
  const state = gesture ?? expression;
  const source = gesture ? pikiGestures[gesture] : pikiExpressions[expression];
  const style = { '--piki-size': size === 'small' ? '112px' : size === 'large' ? '230px' : '170px' } as CSSProperties;
  return <div className={`piki-character piki-character--${state} piki-character--${size} ${className}`} style={style}><img src={source} alt={pikiAssetLabels[state]} draggable="false" /></div>;
}
