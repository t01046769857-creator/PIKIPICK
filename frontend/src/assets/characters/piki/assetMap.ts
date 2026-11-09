import basicGreeting from './expressions/piki-basic-greeting.png';
import curious from './expressions/piki-curious.png';
import encourage from './expressions/piki-encourage.png';
import playful from './expressions/piki-playful.png';
import successHappy from './expressions/piki-success-happy.png';
import surprised from './expressions/piki-surprised.png';
import introReach from './expressions/piki-intro-reach.png';
import introTalk from './expressions/piki-intro-talk.png';
import paper from './gestures/piki-paper.png';
import rock from './gestures/piki-rock.png';
import scissors from './gestures/piki-scissors.png';

export type PikiExpression = 'basicGreeting' | 'successHappy' | 'curious' | 'surprised' | 'playful' | 'encourage' | 'introReach' | 'introTalk';
export type PikiGesture = 'ROCK' | 'SCISSORS' | 'PAPER';

export const pikiExpressions: Record<PikiExpression, string> = { basicGreeting, successHappy, curious, surprised, playful, encourage, introReach, introTalk };
export const pikiGestures: Record<PikiGesture, string> = { ROCK: rock, SCISSORS: scissors, PAPER: paper };
export const pikiAssetLabels: Record<PikiExpression | PikiGesture, string> = {
  basicGreeting: '피키 기본 인사', successHappy: '피키 성공·신남', curious: '피키 호기심', surprised: '피키 놀람', playful: '피키 장난', encourage: '피키 재도전 응원', introReach: '피키 함께 놀기 손 내밀기', introTalk: '피키 말하기',
  ROCK: '피키 바위 손동작', SCISSORS: '피키 가위 손동작', PAPER: '피키 보 손동작',
};
