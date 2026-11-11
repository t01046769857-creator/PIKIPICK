type AudioContextConstructor = new () => AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Context = (window.AudioContext
    || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined;
  if (!Context) return null;

  try {
    return new Context();
  } catch {
    return null;
  }
}

function tone(context: AudioContext, startAt: number, frequency: number, duration: number, volume: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

/** Optional, short waiting rhythm. A failed audio start never blocks input. */
export function playChoiceRhythm(): () => void {
  const context = getAudioContext();
  if (!context) return () => undefined;

  const startAt = context.currentTime + 0.03;
  [523.25, 659.25, 783.99, 659.25, 523.25, 659.25, 783.99, 880].forEach((frequency, index) => {
    tone(context, startAt + index * 0.58, frequency, 0.16, 0.018);
  });
  void context.resume().catch(() => undefined);

  return () => {
    void context.close().catch(() => undefined);
  };
}

export function playCelebrationChime(): () => void {
  const context = getAudioContext();
  if (!context) return () => undefined;
  const startAt = context.currentTime + 0.03;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(context, startAt + index * 0.12, frequency, 0.24, 0.025));
  void context.resume().catch(() => undefined);
  return () => { void context.close().catch(() => undefined); };
}
