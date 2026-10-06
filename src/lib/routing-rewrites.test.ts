import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('localized client navigation', () => {
  it('removes the locale before Next.js applies its interception rewrites', async () => {
    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = rewrites && !Array.isArray(rewrites) ? rewrites.beforeFiles : [];

    expect(beforeFiles).toContainEqual({
      source: '/:locale(en|fr|es|de|it|ja|ko|zh)/:path*',
      destination: '/:path*',
    });
  });
});
