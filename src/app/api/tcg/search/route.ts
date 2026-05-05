import { NextRequest, NextResponse } from 'next/server';
import { getFilterOptions, searchCards } from '@/lib/api/tcg';
import { buildTCGSearchInsights, parseTCGSearchState } from '@/lib/tcg-research';
import type { TCGSearchFacets } from '@/types/tcg';

export async function GET(request: NextRequest) {
  const searchState = parseTCGSearchState(request.nextUrl.searchParams);
  const page = Number(request.nextUrl.searchParams.get('page') ?? '1') || 1;
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '48') || 48, 96);
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
  });
}

function buildFacets(cards: Awaited<ReturnType<typeof searchCards>>['cards']): TCGSearchFacets {
  return {
    cards: cards.length,
    sets: buildCounts(cards.map((card) => card.set?.id ?? 'unknown'), cards.map((card) => card.set?.name ?? 'Unknown')),
    rarities: buildCounts(cards.map((card) => card.rarity ?? 'Unknown')),
    types: buildCounts(cards.flatMap((card) => card.types ?? [])),
    stages: buildCounts(cards.map((card) => card.stage ?? 'Unknown')),
    trainers: buildCounts(cards.map((card) => card.trainerType ?? 'Unknown')),
    energies: buildCounts(cards.map((card) => card.energyType ?? 'Unknown')),
  };
}

function buildCounts(values: string[], labels?: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()]
    .map(([key, count], index) => ({
      key,
      label: labels?.[index] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
