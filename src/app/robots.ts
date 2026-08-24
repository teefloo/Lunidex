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
    'ClaudeBot',
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
    rules: [allowAll, ...explicitAiBots],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
