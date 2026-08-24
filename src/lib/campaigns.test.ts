import { describe, expect, it } from 'vitest';

import { MAX_CAMPAIGN_SLUG_LENGTH, normalizeCampaignSlug } from './campaigns';

describe('campaign slugs', () => {
  it('normalizes short URL-safe campaign identifiers', () => {
    expect(normalizeCampaignSlug(' Summer-2026 ')).toBe('summer-2026');
    expect(normalizeCampaignSlug('tcg-30th')).toBe('tcg-30th');
  });

  it('rejects open-redirect and oversized values', () => {
    expect(normalizeCampaignSlug('https://evil.test')).toBeNull();
    expect(normalizeCampaignSlug('../tcg/start')).toBeNull();
    expect(normalizeCampaignSlug('a'.repeat(MAX_CAMPAIGN_SLUG_LENGTH + 1))).toBeNull();
  });
});
