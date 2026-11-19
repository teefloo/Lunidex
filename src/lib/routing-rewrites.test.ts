import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('localized client navigation', () => {
  it('removes locales except on the dedicated static Pokedex route', async () => {
    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = rewrites && !Array.isArray(rewrites) ? rewrites.beforeFiles : [];

    expect(beforeFiles).toContainEqual({
      source: '/:locale(en|fr|es|de|it|ja|ko|zh)/:path*',
      destination: '/:path*',
      missing: [{ type: 'header', key: 'x-primedex-static-pokedex-route' }],
    });
  });
});
