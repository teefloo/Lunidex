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

  it('preserves card ISR for documents and routes Flight requests through interception', async () => {
    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = (rewrites && !Array.isArray(rewrites) ? rewrites.beforeFiles : undefined) ?? [];
    const isrIndex = beforeFiles.findIndex((rewrite) =>
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

    expect(isrIndex).toBeGreaterThanOrEqual(0);
    expect(beforeFiles[isrIndex]).toMatchObject({
      has: [
        { type: 'header', key: 'x-primedex-static-localized-route', value: 'tcg-card-detail' },
        { type: 'header', key: 'x-primedex-tcg-language', value: '(?<tcgLanguage>[^/]+)' },
      ],
      missing: [{ type: 'header', key: 'next-url' }],
    });

    expect(interceptedNavigationIndex).toBeGreaterThan(isrIndex);
    expect(beforeFiles[interceptedNavigationIndex]).toMatchObject({
      has: [{ type: 'header', key: 'next-url' }],
    });
    expect(interceptedNavigationIndex).toBeLessThan(localeRewriteIndex);
  });
});
