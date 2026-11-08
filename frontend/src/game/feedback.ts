import type { GameMode } from './types';
export const feedback = {
  success: ['우와! 성공!', '정말 잘했어!', '한 번 더 해볼까?'],
  retry: ['앗! 다시 해볼까?', '이번에는 다른 손을 내보자!'],
  noSelection: '손동작을 하나 골라보자!',
  modes: { WIN: '이기기', LOSE: '지기', DRAW: '비기기' } satisfies Record<GameMode, string>,
} as const;
