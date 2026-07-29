import { describe, expect, it } from 'vitest';
import { LAUNCH_SITEMAP_ROUTES } from './sitemap';

describe('launch sitemap routes', () => {
  it('keeps indexable product pages while excluding legal and pre-launch pages', () => {
    const paths = LAUNCH_SITEMAP_ROUTES.map((route) => route.path);

    expect(paths).toContain('tcg');
    expect(paths).toContain('team');
    expect(paths).not.toContain('early-access');
    expect(paths).not.toContain('privacy');
    expect(paths).not.toContain('terms');
    expect(paths).not.toContain('cookies');
    expect(paths).not.toContain('legal');
  });
});
