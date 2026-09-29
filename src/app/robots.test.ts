import { describe, expect, it } from 'vitest';
import { supportedLanguages } from '@/lib/languages';
import robots from './robots';

describe('crawler access policy', () => {
  it('limits only ClaudeBot from localized TCG card details', () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
    const claudeBotRules = rules.filter((rule) => rule.userAgent === 'ClaudeBot');

    expect(claudeBotRules).toHaveLength(1);
    expect(claudeBotRules[0]).toMatchObject({
      allow: ['/', '/api/og/'],
      disallow: [
        '/api/',
        ...supportedLanguages.map((language) => `/${language}/tcg/cards/`),
      ],
    });

    for (const userAgent of ['Claude-SearchBot', 'Claude-User']) {
      expect(rules.find((rule) => rule.userAgent === userAgent)).toMatchObject({
        allow: ['/', '/api/og/'],
        disallow: ['/api/'],
      });
    }
  });
});
