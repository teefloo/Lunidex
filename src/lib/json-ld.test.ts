import { describe, expect, it } from 'vitest';
import { normalizeDisplayName, serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('prevents a profile value from closing an inline script element', () => {
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      name: '</script><script>window.profileScriptRan = true</script>',
    });

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(serialized).name).toBe('</script><script>window.profileScriptRan = true</script>');
  });

  it('escapes every HTML-sensitive and JavaScript line-separator character', () => {
    const serialized = serializeJsonLd({ value: '<>&\u2028\u2029' });

    expect(serialized).toBe('{"value":"\\u003c\\u003e\\u0026\\u2028\\u2029"}');
  });
});

describe('normalizeDisplayName', () => {
  it('preserves international names while normalizing whitespace and controls', () => {
    expect(normalizeDisplayName('  Ash\n Ketchum\u0000  ')).toBe('Ash Ketchum');
    expect(normalizeDisplayName('Élise  ポケモン')).toBe('Élise ポケモン');
  });

  it('rejects a display name that contains no visible characters', () => {
    expect(normalizeDisplayName(' \u0000\n ')).toBeNull();
  });

  it('limits names by Unicode code points instead of UTF-16 code units', () => {
    const name = '😀'.repeat(81);

    expect(Array.from(normalizeDisplayName(name) ?? '')).toHaveLength(80);
  });
});
