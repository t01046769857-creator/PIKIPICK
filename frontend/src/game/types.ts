export type Gesture = 'ROCK' | 'SCISSORS' | 'PAPER';
export type GameMode = 'WIN' | 'LOSE' | 'DRAW';
export type Phase = 'START' | 'MODE_SELECT' | 'INSTRUCTION' | 'READY' | 'PLAYING' | 'RESULT';
export type InputSource = 'BUTTON' | 'AI';
export interface GameInput { gesture: Gesture; source: InputSource }
export interface RoundResult { success: boolean; player: Gesture; opponent: Gesture; mode: GameMode }
