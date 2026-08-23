import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('PWA manifest', () => {
  it('opens a localized Lunidex route and exposes the launch journeys', () => {
    const result = manifest();

    expect(result.short_name).toBe('Lunidex');
    expect(result.start_url).toBe('/en');
    expect(result.icons).toEqual([
      expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', purpose: 'any' }),
    ]);
    expect(result.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      '/en/team',
      '/en/tcg/collection',
      '/en/tcg',
      '/en/quiz',
    ]);
  });
});
