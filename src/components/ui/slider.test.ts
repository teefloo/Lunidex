import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Slider } from './slider';

describe('Slider', () => {
  it('renders a labelled range thumb without client-only script markup', () => {
    const html = renderToStaticMarkup(
      createElement(Slider, { value: [40], 'aria-label': 'Minimum base stats', max: 800 }),
    );

    expect(html).toContain('aria-label="Minimum base stats"');
    expect(html).not.toContain('<script');
  });
});
