import { renderSitemapIndex, sitemapIndexUrls } from '@/lib/sitemap';
import { isNeonConfiguredServer } from '@/lib/neon/server';

export const revalidate = 21600;

export function GET(): Response {
  const urls = sitemapIndexUrls().filter((url) => isNeonConfiguredServer || !url.includes('/sitemaps/sealed-products'));
  return new Response(renderSitemapIndex(urls), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}
