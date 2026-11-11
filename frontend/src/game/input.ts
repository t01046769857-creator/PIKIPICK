import type { GameInput, Gesture } from './types';

/** Current button adapter. Game rules consume only the resulting GameInput. */
export const inputFromButton = (gesture: Gesture): GameInput => ({ gesture, source: 'BUTTON' });

/** Reserved adapter for a future MediaPipe recognizer; no camera code is connected here. */
export const inputFromAI = (gesture: Gesture): GameInput => ({ gesture, source: 'AI' });
