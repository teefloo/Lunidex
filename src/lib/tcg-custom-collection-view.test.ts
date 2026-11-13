import { describe, expect, it } from 'vitest';
import type { TCGCustomCollectionCard } from '@/types/tcg';
import type { TCGCustomCollectionCardDetail } from '@/lib/api/tcg';
import { getTCGCustomCollectionLayoutPage } from '@primedex/core/lib/tcg-custom-collections';
import {
  filterAndSortTCGCustomCollectionCards,
  getTCGCustomCollectionPageNavigationTarget,
  hasTCGCustomCollectionCardViewTransform,
} from './tcg-custom-collection-view';

const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const addedAt = '2026-10-19T10:00:00.000Z';

function reference(cardId: string, cardName: string, language: TCGCustomCollectionCard['language'] = 'en'): TCGCustomCollectionCard {
  return { collectionId, cardId, cardName, language, addedAt, quantity: 1 };
}

function detail(ref: TCGCustomCollectionCard, fields: Partial<TCGCustomCollectionCardDetail['card']> = {}): TCGCustomCollectionCardDetail {
  return {
    ref,
    unavailable: false,
    card: { id: ref.cardId, localId: ref.cardId.split('-').pop() ?? '', name: ref.cardName, ...fields },
  };
}

describe('custom collection card filters and sorting', () => {
  it('navigates from the displayed clamped page after a synchronized preset reduces page count', () => {
    const cardOrder = Array.from({ length: 40 }, (_, index) => ({ cardId: `base1-${index + 1}`, language: 'en' as const }));
    const oldLayout = { collectionId, gridPreset: '2x2' as const, cardOrder };
    const synchronizedLayout = { ...oldLayout, gridPreset: '4x4' as const };
    const previousLayoutPage = getTCGCustomCollectionLayoutPage(oldLayout, 8);
    const displayedLayoutPage = getTCGCustomCollectionLayoutPage(synchronizedLayout, 8);

    expect(previousLayoutPage.page).toBe(8);
    expect(displayedLayoutPage).toMatchObject({ page: 3, pageCount: 3 });
    expect(getTCGCustomCollectionPageNavigationTarget(displayedLayoutPage.page, displayedLayoutPage.pageCount, 'previous')).toBe(2);
    expect(getTCGCustomCollectionPageNavigationTarget(displayedLayoutPage.page, displayedLayoutPage.pageCount, 'next')).toBe(3);
  });

  it('keeps saved manual order when no view transformation is active', () => {
    const manualOrder = [
      reference('base1-4', 'Charizard'),
      reference('base1-1', 'Alakazam'),
      reference('base1-10', 'Caterpie'),
    ];
    const originalOrder = [...manualOrder];
    const filters = { search: '', language: '', rarity: '', setId: '', priceOrder: 'none' as const, displayCurrency: 'USD' as const };
    const result = filterAndSortTCGCustomCollectionCards(manualOrder, [], filters);

    expect(hasTCGCustomCollectionCardViewTransform(filters)).toBe(false);
    expect(result.map(({ cardId }) => cardId)).toEqual(['base1-4', 'base1-1', 'base1-10']);
    expect(result).not.toBe(manualOrder);
    expect(manualOrder).toEqual(originalOrder);
  });

  it('filters matches without changing their saved relative order', () => {
    const japaneseCharizard = reference('sv2a-006', 'リザードン', 'ja');
    const alakazam = reference('base1-1', 'Alakazam');
    const englishCharizard = reference('base1-4', 'Charizard');
    const manualOrder = [japaneseCharizard, alakazam, englishCharizard];
    const originalOrder = [...manualOrder];
    const filters = { search: 'charizard', language: '', rarity: '', setId: '', priceOrder: 'none' as const, displayCurrency: 'USD' as const };
    const details = [detail(japaneseCharizard, { name: 'Charizard' }), detail(englishCharizard)];

    expect(hasTCGCustomCollectionCardViewTransform(filters)).toBe(true);
    expect(filterAndSortTCGCustomCollectionCards(manualOrder, details, filters).map(({ cardId }) => cardId))
      .toEqual(['sv2a-006', 'base1-4']);
    expect(manualOrder).toEqual(originalOrder);
  });

  it('combines search, language, rarity, and set filters using hydrated card data', () => {
    const charizard = reference('base1-4', 'Charizard');
    const alakazam = reference('base1-1', 'Alakazam');
    const japaneseCharizard = reference('sv2a-006', 'リザードン', 'ja');
    const details = [
      detail(charizard, { rarity: 'Rare Holo', set: { id: 'base1', name: 'Base Set' } }),
      detail(alakazam, { rarity: 'Uncommon', set: { id: 'base1', name: 'Base Set' } }),
      detail(japaneseCharizard, { rarity: 'Rare Holo', set: { id: 'sv2a', name: 'Pokémon Card 151' } }),
    ];

    const result = filterAndSortTCGCustomCollectionCards(
      [charizard, alakazam, japaneseCharizard],
      details,
      { search: 'charizard', language: 'en', rarity: 'Rare Holo', setId: 'base1', priceOrder: 'none', displayCurrency: 'USD' },
    );

    expect(result.map((card) => card.cardId)).toEqual(['base1-4']);
  });

  it('sorts priced cards in the selected currency and leaves missing prices last', () => {
    const low = reference('base1-1', 'Alakazam');
    const high = reference('base1-4', 'Charizard');
    const missing = reference('base1-10', 'Caterpie');
    const details = [
      detail(low, { variants: { normal: true }, pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 2 } } } }),
      detail(high, { variants: { normal: true }, pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 50 } } } }),
      detail(missing, { variants: { normal: true }, pricing: { cardmarket: { unit: 'EUR', trend: 7 } } }),
    ];

    const ascendingInput = [high, missing, low];
    const originalAscendingInput = [...ascendingInput];
    const descendingInput = [low, missing, high];
    const originalDescendingInput = [...descendingInput];
    const ascending = filterAndSortTCGCustomCollectionCards(
      ascendingInput, details,
      { search: '', language: '', rarity: '', setId: '', priceOrder: 'asc', displayCurrency: 'USD' },
    );
    const descending = filterAndSortTCGCustomCollectionCards(
      descendingInput, details,
      { search: '', language: '', rarity: '', setId: '', priceOrder: 'desc', displayCurrency: 'USD' },
    );

    expect(ascending.map((card) => card.cardId)).toEqual(['base1-1', 'base1-4', 'base1-10']);
    expect(descending.map((card) => card.cardId)).toEqual(['base1-4', 'base1-1', 'base1-10']);
    expect(hasTCGCustomCollectionCardViewTransform({ search: '', language: '', rarity: '', setId: '', priceOrder: 'asc', displayCurrency: 'USD' })).toBe(true);
    expect(ascendingInput).toEqual(originalAscendingInput);
    expect(descendingInput).toEqual(originalDescendingInput);
  });

  it('keeps manual order for equal and missing prices while sorting priced cards', () => {
    const first = reference('base1-4', 'Charizard');
    const second = reference('base1-1', 'Alakazam');
    const third = reference('base1-10', 'Caterpie');
    const manualOrder = [third, second, first];
    const originalOrder = [...manualOrder];
    const details = [
      detail(first, { variants: { normal: true }, pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 5 } } } }),
      detail(second, { variants: { normal: true }, pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 5 } } } }),
    ];

    const result = filterAndSortTCGCustomCollectionCards(manualOrder, details, {
      search: '', language: '', rarity: '', setId: '', priceOrder: 'asc', displayCurrency: 'USD',
    });

    expect(result.map(({ cardId }) => cardId)).toEqual(['base1-1', 'base1-4', 'base1-10']);
    expect(manualOrder).toEqual(originalOrder);
  });
});
