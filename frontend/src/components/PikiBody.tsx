import bodySource from '../assets/characters/piki/intro-layers/piki-intro-body-base.png';

export const pikiIntroBodySource = bodySource;

interface PikiBodyProps {
  className?: string;
}

/** Stable, registered base layer for the interactive Piki intro. */
export function PikiBody({ className = '' }: PikiBodyProps) {
  return <img className={`piki-body-layer ${className}`} src={pikiIntroBodySource} alt="피키" draggable="false" />;
}
