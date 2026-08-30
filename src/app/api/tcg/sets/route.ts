import { NextRequest, NextResponse } from 'next/server';
import { isCollectionSetSummary } from '@/lib/api/tcg';
import { getCollectionSetCatalogCached } from '@/lib/api/server-cache';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  try {
    const sets = await getCollectionSetCatalogCached(lang);
    if (!Array.isArray(sets) || sets.length === 0 || !sets.every(isCollectionSetSummary)) {
      throw new Error('Collection catalog is empty or malformed');
    }
    return NextResponse.json(
      { sets },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('[TCG API] Collection catalog unavailable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TCG sets' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
