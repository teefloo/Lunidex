import type { MetadataRoute } from 'next';
import { supportedLanguages } from '@/lib/languages';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  const allowAll = {
    userAgent: '*',
    // OG endpoints are public presentation assets; keep them crawlable even
    // though authenticated/API mutations remain disallowed below.
    allow: ['/', '/api/og/'],
    disallow: ['/api/'] as string[],
  };

  // Card-detail pages are an exhaustive, data-heavy TCG catalogue. Keep
  // ClaudeBot's training crawl off those pages while preserving its access to
  // other public content and keeping Claude's search and user-directed bots enabled.
  const claudeBot = {
    userAgent: 'ClaudeBot',
    allow: ['/', '/api/og/'],
    disallow: [
      '/api/',
      ...supportedLanguages.map((language) => `/${language}/tcg/cards/`),
    ],
  };

  const explicitAiBots = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
    'Claude-User',
    'anthropic-ai',
    'Claude-SearchBot',
    'Google-Extended',
    'Applebot-Extended',
    'Amazonbot',
    'cohere-ai',
    'cohere-training-data-crawler',
    'DuckAssistBot',
    'YouBot',
    'MistralAI-User',
    'DeepseekBot',
    'Meta-ExternalAgent',
    'Meta-ExternalFetcher',
    'Gemini-Deep-Research',
    'CCBot',
    'Grok',
    'xAI',
    'Qwen',
    'Tongyi',
    'Aliyun',
    'Manus-AI',
    'Phind',
    'Diffbot',
    'Omgilibot',
    'Bytespider',
    'PetalBot',
    'TurnitinBot',
    'Yandex',
    'DuckDuckBot',
    'PoeBot',
    'AndiBot',
    'KomoBot',
    'YouSearch',
    'ia_archiver',
  ].map((userAgent) => ({
    userAgent,
    allow: ['/', '/api/og/'],
    disallow: ['/api/'],
  }));

  return {
    rules: [allowAll, claudeBot, ...explicitAiBots],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
