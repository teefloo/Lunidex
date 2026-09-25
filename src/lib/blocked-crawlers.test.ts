import { describe, expect, it } from 'vitest';

import { isBlockedTcgCrawler } from './blocked-crawlers';

describe('isBlockedTcgCrawler', () => {
  it.each([
    'ClaudeBot/1.0',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://www.anthropic.com/claude-bot)',
    'Meta-ExternalAgent/1.1',
  ])('blocks %s', (userAgent) => {
    expect(isBlockedTcgCrawler(userAgent)).toBe(true);
  });

  it.each([
    'Claude-User/1.0',
    'Claude-SearchBot/1.0',
    'Meta-ExternalFetcher/1.1',
    'facebookexternalhit/1.1',
    'Googlebot/2.1',
    'Mozilla/5.0',
  ])('preserves %s', (userAgent) => {
    expect(isBlockedTcgCrawler(userAgent)).toBe(false);
  });
});
