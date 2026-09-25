const BLOCKED_TCG_CRAWLER_PATTERN = /\b(?:ClaudeBot|Meta-ExternalAgent)\b/i;

export function isBlockedTcgCrawler(userAgent: string | null | undefined): boolean {
  return typeof userAgent === 'string' && BLOCKED_TCG_CRAWLER_PATTERN.test(userAgent);
}
