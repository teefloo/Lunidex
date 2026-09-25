import type { MetadataRoute } from 'next';
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

  const limitedTcgCrawlers = ['ClaudeBot', 'Meta-ExternalAgent'].map((userAgent) => ({
    userAgent,
    allow: ['/', '/api/og/'],
    disallow: [
      '/api/',
      '/api/og/tcg-card',
      ...['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'].map((language) => `/${language}/tcg/cards/`),
    ],
  }));

  return {
    rules: [allowAll, ...explicitAiBots, ...limitedTcgCrawlers],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
