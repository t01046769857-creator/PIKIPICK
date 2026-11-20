import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { activities, ActivitySelection } from './ActivitySelection';

describe('전체 놀이 선택', () => {
  it('가위바위보와 네 가지 규칙 놀이를 실행 가능한 카드로 제공한다', () => {
    expect(activities).toHaveLength(6);
    expect(new Set(activities.map(activity => activity.id)).size).toBe(6);
    expect(activities.filter(activity => activity.status === 'READY').map(activity => activity.id)).toEqual(['RPS', 'MUK_JJI_PPA', 'FINGER_COUNT', 'NUMBER', 'PATTERN']);
    expect(activities.filter(activity => activity.status === 'COMING_SOON').map(activity => activity.id)).toEqual(['PICTURE_BOOK']);
  });

  it('카드마다 키보드로 선택할 수 있는 버튼 이름을 렌더링한다', () => {
    const html = renderToStaticMarkup(<ActivitySelection onSelect={() => undefined} />);
    expect(html).toContain('가위바위보');
    expect(html).toContain('독서');
    expect(html).toContain('준비 중 안내 보기');
    expect(html).toContain('game-rps.png');
    expect(html).toContain('game-mukjjippa.png');
    expect(html).toContain('game-finger-count.png');
    expect(html).toContain('game-number-play.png');
    expect(html).toContain('game-pattern-sequence.png');
    expect(html).toContain('game-reading.png');
    expect(html).toContain('수 세기 놀이');
  });
});
