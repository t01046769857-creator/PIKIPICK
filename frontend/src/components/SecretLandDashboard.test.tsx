import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SecretBadgeCollection, SecretLandDashboard, secretBadges } from './SecretLandDashboard';
import { StoryNavigation } from './StoryNavigation';

describe('피키픽 비밀나라', () => {
  it('서로 다른 성취 조건을 가진 배지를 제공한다', () => {
    expect(secretBadges).toHaveLength(6);
    expect(new Set(secretBadges.map(badge => badge.id)).size).toBe(secretBadges.length);
    expect(new Set(secretBadges.map(badge => badge.condition)).size).toBe(secretBadges.length);
  });

  it('지도에 배지함과 놀이 선택, 데모 공간 발견 동작을 렌더링한다', () => {
    const html = renderToStaticMarkup(<SecretLandDashboard discovered={false} onDiscover={() => undefined} onBadges={() => undefined} onPlay={() => undefined} />);
    expect(html).toContain('나의 배지함');
    expect(html).toContain('놀이 선택');
    expect(html).toContain('데모로 새 공간 발견하기');
  });

  it('배지 도감은 데모 상태에 따라 미획득 배지를 비활성화한다', () => {
    const html = renderToStaticMarkup(<SecretBadgeCollection discovered={false} onSelect={() => undefined} onPlay={() => undefined} />);
    expect(html).toContain('아직 찾지 못한 배지');
    expect(html).toContain('disabled=""');
  });

  it('메뉴에 피키픽 비밀나라를 표시한다', () => {
    const html = renderToStaticMarkup(<StoryNavigation soundEnabled onSound={() => undefined} onNavigate={() => undefined} />);
    expect(html).toContain('피키픽 비밀나라');
    expect(html).toContain('상상표현놀이');
    expect(html).toContain('popup-replace/menu-home.png');
    expect(html).toContain('popup-replace/menu-play-select.png');
    expect(html).toContain('menu-rule-practice.png');
    expect(html).toContain('menu-secret-land.png');
    expect(html).toContain('popup-replace/menu-sound-on.png');
    expect(html).toContain('menu-imagination.png');
    expect(html).not.toContain('내 별');
  });
});
