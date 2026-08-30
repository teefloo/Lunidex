import { NextRequest, NextResponse } from 'next/server';
import {
  buildSetCollectionCards,
  isTcgLangSupported,
  normalizeTcgPositiveInteger,
  TCG_COLLECTION_MAX_CARDS,
} from '@/lib/api/tcg';

// A set id is a short alphanumeric slug (e.g. "swsh3", "sv03.5"). Reject anything
// else before hitting the upstream API.
const SET_ID_PATTERN = /^[a-z0-9][a-z0-9.\-]{0,31}$/i;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const setId = params.get('setId')?.trim() ?? '';
  if (!SET_ID_PATTERN.test(setId)) {
    return NextResponse.json({ error: 'Invalid setId' }, { status: 400 });
  }

  const rawLang = params.get('lang')?.trim() ?? 'en';
  const lang = isTcgLangSupported(rawLang) ? rawLang : 'en';

  const rawLimit = Number.parseInt(params.get('limit') ?? '', 10);
  const maxCards = Math.min(
    normalizeTcgPositiveInteger(rawLimit, TCG_COLLECTION_MAX_CARDS),
    TCG_COLLECTION_MAX_CARDS,
  );

  try {
    const cards = await buildSetCollectionCards(setId, lang, maxCards, request.signal);
    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'Set cards unavailable' },
        { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    return NextResponse.json(
      { setId, cards },
      {
        // Owned-independent payload: safe to cache at the edge for all users.
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error(`[TCG API] Failed to build collection cards for ${setId}:`, error);
    return NextResponse.json({ error: 'Failed to build collection cards' }, { status: 502 });
  }
}
