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
import rigBody from './rig/piki-rig-body.png';
import rigHeadShell from './rig/piki-rig-head-shell.png';
import rigArmWave from './rig/piki-rig-arm-wave.png';
import rigArmReach from './rig/piki-rig-arm-reach.png';
import rigEyesOpen from './rig/piki-rig-eyes-open.png';
import rigEyesBlink from './rig/piki-rig-eyes-blink.png';
import rigMouthClosed from './rig/piki-rig-mouth-closed.png';
import rigMouthOpen from './rig/piki-rig-mouth-open.png';

export type PikiExpression = 'basicGreeting' | 'successHappy' | 'curious' | 'surprised' | 'playful' | 'encourage' | 'introReach' | 'introTalk';
export type PikiGesture = 'ROCK' | 'SCISSORS' | 'PAPER';

export const pikiExpressions: Record<PikiExpression, string> = { basicGreeting, successHappy, curious, surprised, playful, encourage, introReach, introTalk };
export const pikiGestures: Record<PikiGesture, string> = { ROCK: rock, SCISSORS: scissors, PAPER: paper };
/** Original full-character frames retained as brief pose-transition bridges. */
export const pikiIntroFrames = { reach: introReach, talk: introTalk } as const;
/** Independent layers used only by the interactive intro rig. */
export const pikiRigAssets = {
  body: rigBody,
  headShell: rigHeadShell,
  armWave: rigArmWave,
  armReach: rigArmReach,
  eyesOpen: rigEyesOpen,
  eyesBlink: rigEyesBlink,
  mouthClosed: rigMouthClosed,
  mouthOpen: rigMouthOpen,
} as const;
export const pikiAssetLabels: Record<PikiExpression | PikiGesture, string> = {
  basicGreeting: '피키 기본 인사', successHappy: '피키 성공·신남', curious: '피키 호기심', surprised: '피키 놀람', playful: '피키 장난', encourage: '피키 재도전 응원', introReach: '피키 함께 놀기 손 내밀기', introTalk: '피키 말하기',
  ROCK: '피키 바위 손동작', SCISSORS: '피키 가위 손동작', PAPER: '피키 보 손동작',
};
