interface PikiSpeechBubbleProps {
  children: string;
}

/** Read-only speech bubble kept outside Piki's face and hand interaction area. */
export function PikiSpeechBubble({ children }: PikiSpeechBubbleProps) {
  return <div className="intro-v2-speech" aria-live="polite"><span>{children}</span></div>;
}
