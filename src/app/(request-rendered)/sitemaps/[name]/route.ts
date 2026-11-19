import {
  renderUrlset,
  SITEMAP_FILE_DESCRIPTORS,
} from '@/lib/sitemap';
import { getSitemapEntries } from '@/lib/sitemap-data';

export const revalidate = 21600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name: rawName } = await params;
  const name = rawName.endsWith('.xml') ? rawName.slice(0, -4) : rawName;
  const descriptor = SITEMAP_FILE_DESCRIPTORS.find((candidate) => candidate.id === name);
  if (!descriptor) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const entries = await getSitemapEntries(descriptor.family, descriptor.language, descriptor.chunk);
    return new Response(renderUrlset(entries), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    // A partial upstream inventory must be visible as an error. Returning an
    // empty/short 200 sitemap would replace a previously complete file in a
    // crawler's view and make the incident much harder to diagnose.
    console.error(`[sitemap:${name}] failed integrity or data checks`, error);
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '900',
      },
    });
  }
}
