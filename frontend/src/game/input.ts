import type { GameInput, Gesture } from './types';

/** 현재 버튼 입력 어댑터. 게임 규칙은 변환된 GameInput만 사용한다. */
export const inputFromButton = (gesture: Gesture): GameInput => ({ gesture, source: 'BUTTON' });

/** 향후 MediaPipe 인식기를 위한 예약 어댑터이며, 여기에는 카메라 코드가 연결되어 있지 않다. */
export const inputFromAI = (gesture: Gesture): GameInput => ({ gesture, source: 'AI' });
