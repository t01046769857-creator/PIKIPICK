import { PikiCharacter } from './PikiCharacter';
import { PikiHand } from './PikiHand';
import './ActivitySelection.css';

export interface ActivityItem {
  id: 'RPS' | 'MUK_JJI_PPA' | 'FINGER_COUNT' | 'NUMBER' | 'PATTERN' | 'PICTURE_BOOK';
  title: string;
  status: 'READY' | 'COMING_SOON';
  illustration: 'RPS' | 'MUK_JJI_PPA' | 'FINGER_COUNT' | 'NUMBER' | 'PATTERN' | 'PICTURE_BOOK';
  pictureLabel: string;
  tone: 'peach' | 'mint' | 'sky' | 'lemon' | 'lilac' | 'rose';
}

export const activities: readonly ActivityItem[] = [
  { id: 'RPS', title: '가위바위보', status: 'READY', illustration: 'RPS', pictureLabel: '피키의 바위 가위 보 손동작 그림', tone: 'peach' },
  { id: 'MUK_JJI_PPA', title: '묵찌빠', status: 'COMING_SOON', illustration: 'MUK_JJI_PPA', pictureLabel: '서로 마주 보는 피키 손동작 대결 그림', tone: 'mint' },
  { id: 'FINGER_COUNT', title: '손가락 수 세기', status: 'COMING_SOON', illustration: 'FINGER_COUNT', pictureLabel: '펴진 손가락과 하나부터 다섯까지 세는 점 그림', tone: 'sky' },
  { id: 'NUMBER', title: '숫자 놀이', status: 'COMING_SOON', illustration: 'NUMBER', pictureLabel: '사과 모양 수량 놀이 그림', tone: 'lemon' },
  { id: 'PATTERN', title: '패턴·순서 놀이', status: 'COMING_SOON', illustration: 'PATTERN', pictureLabel: '색과 모양이 반복되는 순서 그림', tone: 'lilac' },
  { id: 'PICTURE_BOOK', title: '그림책 놀이', status: 'COMING_SOON', illustration: 'PICTURE_BOOK', pictureLabel: '피키와 펼쳐진 그림책 그림', tone: 'rose' },
];

function ActivityIllustration({ activity }: { activity: ActivityItem }) {
  if (activity.illustration === 'RPS') return <span className="activity-illustration activity-illustration--rps" role="img" aria-label={activity.pictureLabel}>
    <PikiHand decorative gesture="ROCK" /><PikiHand decorative gesture="SCISSORS" /><PikiHand decorative gesture="PAPER" />
  </span>;
  if (activity.illustration === 'MUK_JJI_PPA') return <span className="activity-illustration activity-illustration--muk" role="img" aria-label={activity.pictureLabel}>
    <PikiHand decorative gesture="ROCK" /><i aria-hidden="true" /><PikiHand decorative gesture="SCISSORS" />
  </span>;
  if (activity.illustration === 'FINGER_COUNT') return <span className="activity-illustration activity-illustration--count" role="img" aria-label={activity.pictureLabel}>
    <PikiHand decorative gesture="PAPER" /><span className="activity-count-dots" aria-hidden="true">{[1, 2, 3, 4, 5].map(number => <i key={number}>{number}</i>)}</span>
  </span>;
  if (activity.illustration === 'NUMBER') return <span className="activity-illustration activity-illustration--number" role="img" aria-label={activity.pictureLabel}>
    {[1, 2, 3].map(number => <i key={number}><b>{number}</b></i>)}
  </span>;
  if (activity.illustration === 'PATTERN') return <span className="activity-illustration activity-illustration--pattern" role="img" aria-label={activity.pictureLabel}>
    {['circle', 'square', 'triangle', 'circle', 'square'].map((shape, index) => <i key={`${shape}-${index}`} className={`activity-pattern-shape is-${shape}`} />)}
  </span>;
  return <span className="activity-illustration activity-illustration--book" role="img" aria-label={activity.pictureLabel}>
    <PikiCharacter expression="curious" size="small" /><i className="activity-book-pages" aria-hidden="true"><b /><b /></i>
  </span>;
}

export function ActivitySelection({ onSelect }: { onSelect: (activity: ActivityItem) => void }) {
  return <div className="activity-selection">
    <div className="activity-selection__heading">
      <PikiCharacter expression="basicGreeting" size="medium" className="activity-selection__piki" />
      <div><h2>피키와 함께 놀아요!</h2><p>그림을 누르고 놀이를 골라요.</p></div>
    </div>
    <div className="activity-selection__grid" role="list" aria-label="놀이 고르기">
      {activities.map(activity => <button key={activity.id} type="button" role="listitem" className={`activity-card activity-card--${activity.tone}`} onClick={() => onSelect(activity)} aria-label={`${activity.title}, ${activity.status === 'READY' ? '놀이 시작' : '준비 중 안내 보기'}`}>
        <ActivityIllustration activity={activity} />
        <strong>{activity.title}</strong>
        <span className={`activity-card__status ${activity.status === 'READY' ? 'is-ready' : ''}`}>{activity.status === 'READY' ? '놀 수 있어요' : '준비 중'}</span>
      </button>)}
    </div>
  </div>;
}

export function ComingSoonNotice({ activity, onClose }: { activity: ActivityItem; onClose: () => void }) {
  return <div className="activity-notice-backdrop" role="presentation">
    <section className="activity-notice" role="dialog" aria-modal="true" aria-labelledby="coming-soon-title">
      <PikiCharacter expression="encourage" size="medium" />
      <ActivityIllustration activity={activity} />
      <h2 id="coming-soon-title">곧 만나요!</h2>
      <p>{activity.title} 놀이를 피키가 준비하고 있어요.</p>
      <button type="button" className="primary" onClick={onClose}>놀이 고르기로</button>
    </section>
  </div>;
}
