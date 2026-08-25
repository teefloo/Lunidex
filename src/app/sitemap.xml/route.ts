import { renderSitemapIndex, sitemapIndexUrls } from '@/lib/sitemap';

export const revalidate = 21600;

export function GET(): Response {
  return new Response(renderSitemapIndex(sitemapIndexUrls()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}
