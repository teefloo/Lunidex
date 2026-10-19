import { describe, expect, it } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import {
  getTCGIllustratorAliases,
  buildTCGIllustratorPath,
  isTCGIllustratorCredit,
  mergeTCGIllustratorCards,
  normalizeTCGIllustratorIdentity,
  paginateTCGIllustratorCards,
  parseTCGIllustratorPage,
} from './tcg-illustrators';

function card(id: string): TCGCard {
  return { id, localId: id.slice(id.lastIndexOf('-') + 1), name: `Card ${id}` };
}

describe('TCG illustrator identity', () => {
  it('normalizes Unicode, case, and whitespace without removing punctuation', () => {
    expect(normalizeTCGIllustratorIdentity('  ÁRIta   & Friends / XY  ')).toBe('árita & friends / xy');
  });

  it('ignores missing credits but keeps collective credits intact', () => {
    expect(isTCGIllustratorCredit(undefined)).toBe(false);
    expect(isTCGIllustratorCredit(' N/A ')).toBe(false);
    expect(isTCGIllustratorCredit('Shinji Higuchi + Noriko Takaya')).toBe(true);
    expect(getTCGIllustratorAliases(
      ['Saino Misaki', 'saino misaki', 'Saino Misaky'],
      normalizeTCGIllustratorIdentity('SAINO MISAKI'),
    )).toEqual(['Saino Misaki', 'saino misaki']);
  });

  it('builds locale-aware artist URLs and rejects malformed page values', () => {
    expect(buildTCGIllustratorPath('Shinji Kanda', 'fr', 2))
      .toBe('/tcg/illustrators/shinji%20kanda?tcgLang=fr&page=2');
    expect(buildTCGIllustratorPath('A/B + C', 'en', 1))
      .toBe('/tcg/illustrators/a%2Fb%20%2B%20c');
    expect(parseTCGIllustratorPage(undefined)).toBe(1);
    expect(parseTCGIllustratorPage('2')).toBe(2);
    expect(parseTCGIllustratorPage('0')).toBeNull();
    expect(parseTCGIllustratorPage('1.5')).toBeNull();
    expect(parseTCGIllustratorPage(['1', '2'])).toBeNull();
  });
});

describe('TCG illustrator card lists', () => {
  it('deduplicates by card ID and sorts IDs deterministically', () => {
    expect(mergeTCGIllustratorCards([[card('sv2-2'), card('base1-1')], [card('sv2-2')]]).map(({ id }) => id))
      .toEqual(['base1-1', 'sv2-2']);
  });

  it('returns bounded pages and the full deduplicated count', () => {
    const cards = Array.from({ length: 26 }, (_, index) => card(`card-${String(index + 1).padStart(2, '0')}`));
    const result = paginateTCGIllustratorCards(cards.reverse(), 2);

    expect(result.total).toBe(26);
    expect(result.pageCount).toBe(2);
    expect(result.cards).toHaveLength(2);
    expect(result.cards.map(({ id }) => id)).toEqual(['card-25', 'card-26']);
  });
});
