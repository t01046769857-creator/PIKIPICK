import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ImaginationExpressionPlay } from './ImaginationExpressionPlay';

describe('상상표현놀이 MVP', () => {
  it('starts with five expression themes and keeps the artwork gallery action', () => {
    const html = renderToStaticMarkup(<ImaginationExpressionPlay onBack={() => undefined} />);
    expect(html).toContain('어떤 표현 주제를 골라 볼까?');
    expect(html).toContain('expression-rps');
    expect(html).toContain('expression-mukjjippa');
    expect(html).toContain('expression-finger-count');
    expect(html).toContain('expression-numbers');
    expect(html).toContain('expression-patterns');
    expect(html).toContain('준비 중');
    expect(html).toContain('작품 보기');
  });
});
