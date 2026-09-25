import { describe, expect, it } from 'vitest';

import robots from './robots';

function getRule(userAgent: string) {
  const rules = robots().rules;
  const entries = Array.isArray(rules) ? rules : [rules];
  return entries.find((rule) => {
    const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
    return agents.includes(userAgent);
  });
}

describe('robots rules for high-volume crawlers', () => {
  it.each(['ClaudeBot', 'Meta-ExternalAgent'])('limits %s to non-TCG-card pages', (userAgent) => {
    const rule = getRule(userAgent);

    expect(rule).toBeDefined();
    expect(rule?.allow).toContain('/');
    expect(rule?.disallow).toContain('/api/');
    expect(rule?.disallow).toContain('/api/og/tcg-card');
    for (const locale of ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh']) {
      expect(rule?.disallow).toContain(`/${locale}/tcg/cards/`);
    }
  });

  it('keeps other explicitly configured crawlers allowed on TCG card pages', () => {
    const googlebot = getRule('Google-Extended');
    const claudeUser = getRule('Claude-User');
    const metaFetcher = getRule('Meta-ExternalFetcher');

    expect(googlebot?.disallow).not.toContain('/en/tcg/cards/');
    expect(claudeUser?.disallow).not.toContain('/en/tcg/cards/');
    expect(metaFetcher?.disallow).not.toContain('/en/tcg/cards/');
  });
});
