import { NextRequest, NextResponse } from 'next/server';
import { getFilterOptions, normalizeTcgPositiveInteger, searchCards } from '@/lib/api/tcg';
import {
  buildTCGSearchInsights,
  DEFAULT_TCG_SEARCH_LIMIT,
  MAX_TCG_SEARCH_LIMIT,
  MAX_TCG_SEARCH_PAGE,
  parseTCGSearchState,
} from '@/lib/tcg-research';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import type { TCGSearchFacets } from '@/types/tcg';

export async function GET(request: NextRequest) {
  if (!rateLimit(`tcg-search:${ipKey(request)}`, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const searchState = parseTCGSearchState(request.nextUrl.searchParams);
    const page = Math.min(
      normalizeTcgPositiveInteger(Number(request.nextUrl.searchParams.get('page') ?? '1'), 1),
      MAX_TCG_SEARCH_PAGE,
    );
    const limit = Math.min(
      normalizeTcgPositiveInteger(
        Number(request.nextUrl.searchParams.get('limit') ?? String(DEFAULT_TCG_SEARCH_LIMIT)),
        DEFAULT_TCG_SEARCH_LIMIT,
      ),
      MAX_TCG_SEARCH_LIMIT,
    );
    const lang = request.nextUrl.searchParams.get('lang') ?? 'en';

    const [results, options] = await Promise.all([
      searchCards(searchState.filters, lang, page, limit),
      getFilterOptions(lang),
    ]);

    const facets = buildFacets(results.cards);
    const insights = buildTCGSearchInsights(results.cards, facets);

    return NextResponse.json({
      cards: results.cards,
      hasMore: results.hasMore,
      facets,
      insights,
      options,
      filters: searchState.filters,
      viewMode: searchState.viewMode,
      compare: searchState.compare,
    }, {
      headers: {
        // Search results and filter metadata are public and keyed by the full
        // query string, so repeated catalog requests can be served at the edge.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('[TCG API] Failed to execute search route:', error);
    return NextResponse.json({ error: 'Failed to search cards' }, { status: 502 });
  }
}

function buildFacets(cards: Awaited<ReturnType<typeof searchCards>>['cards']): TCGSearchFacets {
  const setLabelMap = new Map(cards.map((card) => [card.set?.id ?? 'unknown', card.set?.name ?? 'Unknown']));
  return {
    cards: cards.length,
    sets: buildCounts(cards.map((card) => card.set?.id ?? 'unknown'), setLabelMap),
    rarities: buildCounts(cards.map((card) => card.rarity ?? 'Unknown')),
    types: buildCounts(cards.flatMap((card) => card.types ?? [])),
    stages: buildCounts(cards.map((card) => card.stage ?? 'Unknown')),
    trainers: buildCounts(cards.map((card) => card.trainerType ?? 'Unknown')),
    energies: buildCounts(cards.map((card) => card.energyType ?? 'Unknown')),
  };
}

function buildCounts(values: string[], labelMap?: Map<string, string>) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: labelMap?.get(key) ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
