import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('localized client navigation', () => {
  it('removes locales except on dedicated static localized routes', async () => {
    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = (rewrites && !Array.isArray(rewrites) ? rewrites.beforeFiles : undefined) ?? [];

    expect(beforeFiles).toContainEqual({
      source: '/:locale(en|fr|es|de|it|ja|ko|zh)/:path*',
      destination: '/:path*',
      missing: [{ type: 'header', key: 'x-primedex-static-localized-route' }],
    });
  });

  it('routes card documents through the dynamic page and Flight through interception', async () => {
    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = (rewrites && !Array.isArray(rewrites) ? rewrites.beforeFiles : undefined) ?? [];
    const cardIsrIndex = beforeFiles.findIndex((rewrite) =>
      'source' in rewrite
      && rewrite.source === '/:locale(en|fr|es|de|it|ja|ko|zh)/tcg/cards/:id'
      && rewrite.destination === '/:locale/tcg/cards/:id/cached/:tcgLanguage',
    );
    const interceptedNavigationIndex = beforeFiles.findIndex((rewrite) =>
      'source' in rewrite
      && rewrite.source === '/:locale(en|fr|es|de|it|ja|ko|zh)/tcg/cards/:id'
      && rewrite.destination === '/tcg/cards/:id',
    );
    const localeRewriteIndex = beforeFiles.findIndex((rewrite) =>
      'source' in rewrite
      && rewrite.source === '/:locale(en|fr|es|de|it|ja|ko|zh)/:path*',
    );

    expect(cardIsrIndex).toBe(-1);

    expect(interceptedNavigationIndex).toBeGreaterThanOrEqual(0);
    expect(beforeFiles[interceptedNavigationIndex]).toMatchObject({
      has: [{ type: 'header', key: 'next-url' }],
    });
    expect(interceptedNavigationIndex).toBeLessThan(localeRewriteIndex);
  });
});
