export type Gesture = 'ROCK' | 'SCISSORS' | 'PAPER';
export type GameMode = 'WIN' | 'LOSE' | 'DRAW';
export type Phase = 'START' | 'MODE_SELECT' | 'RULE_PRACTICE' | 'RECORDS' | 'INSTRUCTION' | 'READY' | 'PLAYING' | 'RESULT';
export type InputSource = 'BUTTON' | 'AI';
export interface GameInput { gesture: Gesture; source: InputSource }
export interface RoundResult { success: boolean; player: Gesture; opponent: Gesture; mode: GameMode }
export interface InputTiming { id: number; startedAt: number; decidedAt: number }
export interface AdvanceTiming { id: number; startedAt: number; kind: 'NEXT' | 'RETRY' }
