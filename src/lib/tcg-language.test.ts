import { describe, expect, it } from 'vitest';

import { resolveRequestedTCGCardLanguage } from './tcg-language';
import { parseTCGSearchState } from './tcg-research';

describe('resolveRequestedTCGCardLanguage', () => {
  it.each([
    ['en', 'en'],
    ['ZH-CN', 'zh-cn'],
    ['zh-tw', 'zh-tw'],
    ['ja', 'ja'],
  ])('normalizes supported query language %s to %s', (requested, expected) => {
    expect(resolveRequestedTCGCardLanguage(requested)).toBe(expected);
  });

  it.each([null, undefined, '', 'zh', 'zh-hans', 'cn', 'xx'])(
    'uses deterministic English fallback for %s',
    (requested) => {
      expect(resolveRequestedTCGCardLanguage(requested)).toBe(requested == null ? null : 'en');
    },
  );

  it('keeps an explicit invalid query deterministic instead of falling back to persistence', () => {
    expect(parseTCGSearchState(new URLSearchParams('tcgLang=zh')).tcgLang).toBe('en');
    expect(parseTCGSearchState(new URLSearchParams()).tcgLang).toBeUndefined();
  });
});
