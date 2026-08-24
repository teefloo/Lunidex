import { describe, expect, it } from 'vitest';

import robots from './robots';

describe('robots policy', () => {
  it('keeps public OG assets crawlable while protecting API routes', () => {
    const result = robots();
    const firstRule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(firstRule).toMatchObject({ userAgent: '*', disallow: ['/api/'] });
    expect(firstRule.allow).toContain('/api/og/');
  });
});
