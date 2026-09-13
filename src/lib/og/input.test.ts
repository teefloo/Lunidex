import { describe, expect, it } from 'vitest';

import { sanitizeOgText } from './input';

describe('OG text sanitization', () => {
  it('keeps TCG rarity markers renderable without Satori dynamic symbol fonts', () => {
    expect(sanitizeOgText('◇ ☆ ✦', 'fallback', 32)).toBe('* * *');
  });

  it('preserves ordinary localized text while removing control characters', () => {
    expect(sanitizeOgText('  Évoli\n日本語  ', 'fallback', 32)).toBe('Évoli 日本語');
  });
});
