import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { activities, ActivitySelection } from './ActivitySelection';

describe('전체 놀이 선택', () => {
  it('가위바위보와 준비 중 놀이 다섯 개를 서로 다른 ID로 제공한다', () => {
    expect(activities).toHaveLength(6);
    expect(new Set(activities.map(activity => activity.id)).size).toBe(6);
    expect(activities.filter(activity => activity.status === 'READY').map(activity => activity.id)).toEqual(['RPS']);
    expect(activities.filter(activity => activity.status === 'COMING_SOON')).toHaveLength(5);
  });

  it('카드마다 키보드로 선택할 수 있는 버튼 이름을 렌더링한다', () => {
    const html = renderToStaticMarkup(<ActivitySelection onSelect={() => undefined} />);
    expect(html).toContain('가위바위보');
    expect(html).toContain('그림책 놀이');
    expect(html).toContain('준비 중 안내 보기');
    expect(html).toContain('data-gesture="ROCK"');
    expect(html).toContain('data-gesture="SCISSORS"');
    expect(html).toContain('data-gesture="PAPER"');
  });
});
