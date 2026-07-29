import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('PWA manifest', () => {
  it('opens a localized Lunidex route and exposes the launch journeys', () => {
    const result = manifest();

    expect(result.short_name).toBe('Lunidex');
    expect(result.start_url).toBe('/en');
    expect(result.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      '/en/team',
      '/en/tcg/collection',
      '/en/tcg',
      '/en/quiz',
    ]);
  });
});
