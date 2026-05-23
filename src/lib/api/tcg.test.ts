import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
    })),
  },
}));

vi.mock('axios-retry', () => ({
  default: Object.assign(vi.fn(), {
    exponentialDelay: vi.fn(),
    isNetworkOrIdempotentRequestError: vi.fn(() => false),
  }),
}));

vi.mock('./cache', () => ({
  getCachedData: vi.fn().mockResolvedValue(null),
  setCachedData: vi.fn().mockResolvedValue(undefined),
}));

import { getCachedData, setCachedData } from './cache';
import { buildCardQueryParams, normalizeTcgPositiveInteger, searchCards } from './tcg';

const mockedGetCachedData = vi.mocked(getCachedData);
const mockedSetCachedData = vi.mocked(setCachedData);

function makeCard(id: string, overrides: Partial<TCGCard> = {}): TCGCard {
  return {
    id,
    localId: id,
    name: `Card ${id}`,
    image: `https://assets.tcgdex.net/en/base/base1/${id}`,
    rarity: 'Common',
    category: 'Pokemon',
    stage: 'Basic',
    types: ['Colorless'],
    ...overrides,
  };
}

beforeEach(() => {
  mockGet.mockReset();
  mockedGetCachedData.mockResolvedValue(null);
  mockedSetCachedData.mockClear();
});

describe('tcg api helpers', () => {
  it('serializes catalog filters into stable API query params', () => {
    const params = buildCardQueryParams(
      {
        searchTerm: 'Charizard',
        selectedCategory: 'Pokemon',
        selectedSet: 'sv01',
        selectedRarity: 'Rare',
        selectedTypes: ['Fire', 'Dragon'],
        selectedPhase: 'Stage2',
        selectedTrainerTypes: ['Supporter'],
        selectedEnergyTypes: ['Special'],
        minHp: 120,
        maxHp: 330,
        sortBy: 'hp',
        sortOrder: 'desc',
      },
      2,
      48,
    );

    expect(params.get('pagination:page')).toBe('2');
    expect(params.get('pagination:itemsPerPage')).toBe('49');
    expect(params.get('sort:field')).toBe('hp');
    expect(params.get('sort:order')).toBe('DESC');
    expect(params.get('name')).toBe('like:Charizard');
    expect(params.get('category')).toBe('Pokemon');
    expect(params.get('set.id')).toBe('eq:sv01');
    expect(params.get('types')).toBe('Fire|Dragon');
    expect(params.get('stage')).toBe('eq:Stage2');
    expect(params.get('trainerType')).toBe('Supporter');
    expect(params.get('energyType')).toBe('Special');
    expect(params.getAll('hp')).toEqual(['gte:120', 'lte:330']);
  });

  it('normalizes invalid pagination values to safe defaults', () => {
    expect(normalizeTcgPositiveInteger(-3, 1)).toBe(1);
    expect(normalizeTcgPositiveInteger(Number.NaN, 48)).toBe(48);

    const params = buildCardQueryParams(
      {
        sortBy: 'name',
        sortOrder: 'asc',
      },
      -3,
      0,
    );

    expect(params.get('pagination:page')).toBe('1');
    expect(params.get('pagination:itemsPerPage')).toBe('49');
  });

  it('trims overflow cards and marks the page as having more results', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        makeCard('001'),
        makeCard('002'),
        makeCard('003'),
        makeCard('004'),
      ],
    });

    const result = await searchCards(
      {
        selectedCategory: 'Pokemon',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'en',
      1,
      3,
    );

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/en/cards?'),
    );
    expect(result.cards).toHaveLength(3);
    expect(result.cards.map((card) => card.id)).toEqual(['001', '002', '003']);
    expect(result.hasMore).toBe(true);
    expect(mockedSetCachedData).toHaveBeenCalled();
  });

  it('sorts collector numbers globally so low numbers come first', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('pagination%3Apage=1')) {
        return {
          data: [
            makeCard('124', { localId: '124', name: 'Card 124' }),
            makeCard('123', { localId: '123', name: 'Card 123' }),
            makeCard('122', { localId: '122', name: 'Card 122' }),
          ],
        };
      }

      if (url.includes('pagination%3Apage=2')) {
        return {
          data: [
            makeCard('001', { localId: '001', name: 'Card 001' }),
            makeCard('002', { localId: '002', name: 'Card 002' }),
          ],
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'Pokemon',
        selectedSet: 'me03',
        sortBy: 'number',
        sortOrder: 'asc',
      },
      'en',
      1,
      2,
    );

    expect(result.cards.map((card) => card.localId)).toEqual(['001', '002']);
  });

  it('hydrates missing catalog metadata so visual rarity effects can be mapped', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        return {
          data: [
            makeCard('001', {
              rarity: undefined,
              category: undefined,
              stage: undefined,
              types: undefined,
            }),
          ],
        };
      }

      if (url.includes('/cards/001')) {
        return {
          data: makeCard('001', {
            rarity: 'Rare Holo',
            category: 'Pokemon',
            stage: 'Stage2',
            types: ['Psychic'],
          }),
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'Pokemon',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'en',
      1,
      1,
    );

    expect(result.cards[0]).toMatchObject({
      id: '001',
      rarity: 'Rare Holo',
      stage: 'Stage2',
      types: ['Psychic'],
    });
  });

  it('normalizes localized category names while hydrating visual metadata', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        return {
          data: [
            makeCard('me03-087', {
              category: undefined,
              rarity: undefined,
              energyType: undefined,
            }),
          ],
        };
      }

      if (url.includes('/cards/me03-087')) {
        return {
          data: makeCard('me03-087', {
            category: 'Énergie' as TCGCard['category'],
            rarity: 'Rare',
            energyType: 'De base',
            variants: { firstEdition: false, holo: true, normal: false, reverse: true, wPromo: false },
          }),
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'all',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'fr',
      1,
      1,
    );

    expect(result.cards[0]).toMatchObject({
      id: 'me03-087',
      category: 'Energy',
      rarity: 'Rare',
      energyType: 'De base',
    });
  });

  it('filters promo and reverse-holo style cards locally when the API cannot query them', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        return {
          data: [
            makeCard('001'),
            makeCard('002', {
              rarity: 'Trainer Gallery',
              variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: true },
            }),
            makeCard('003'),
          ],
        };
      }

      if (url.includes('/cards/001')) {
        return { data: makeCard('001') };
      }

      if (url.includes('/cards/002')) {
        return {
          data: makeCard('002', {
            rarity: 'Trainer Gallery',
            variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: true },
          }),
        };
      }

      if (url.includes('/cards/003')) {
        return { data: makeCard('003') };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'Trainer',
        selectedRarity: 'Promo',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'en',
      1,
      3,
    );

    expect(mockGet.mock.calls[0][0]).not.toContain('rarity=');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.id).toBe('002');
    expect(result.hasMore).toBe(false);
  });

  it('matches localized rarity labels against canonical TCG rarities', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        return {
          data: [
            makeCard('me03-086', {
              rarity: 'Special Illustration Rare',
              category: 'Pokemon',
            }),
          ],
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'Pokemon',
        selectedSet: 'me03',
        selectedRarity: 'Illustration spéciale rare',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'en',
      1,
      10,
    );

    expect(result.cards.map((card) => card.id)).toEqual(['me03-086']);
    expect(result.hasMore).toBe(false);
  });

  it('hydrates trainer cards before applying trainer type filters', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        return {
          data: [
            makeCard('001'),
            makeCard('002', {
              category: 'Trainer',
              trainerType: 'Goldenrod Game Corner',
            }),
            makeCard('003'),
          ],
        };
      }

      if (url.includes('/cards/001')) {
        return { data: makeCard('001') };
      }

      if (url.includes('/cards/002')) {
        return {
          data: makeCard('002', {
            category: 'Trainer',
            trainerType: 'Goldenrod Game Corner',
          }),
        };
      }

      if (url.includes('/cards/003')) {
        return { data: makeCard('003') };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'Trainer',
        selectedTrainerTypes: ['Goldenrod Game Corner'],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'en',
      1,
      3,
    );

    expect(result.cards.map((card) => card.id)).toEqual(['002']);
    expect(result.hasMore).toBe(false);
  });

  it('maps Basic energy to Normal energy cards during local filtering', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/cards?')) {
        return {
          data: [
            makeCard('001', { category: 'Energy', energyType: 'Normal' }),
            makeCard('002', { category: 'Energy', energyType: 'Special' }),
            makeCard('003', { category: 'Energy', energyType: 'Normal' }),
          ],
        };
      }

      if (url.includes('/cards/001')) {
        return { data: makeCard('001', { category: 'Energy', energyType: 'Normal' }) };
      }

      if (url.includes('/cards/002')) {
        return { data: makeCard('002', { category: 'Energy', energyType: 'Special' }) };
      }

      if (url.includes('/cards/003')) {
        return { data: makeCard('003', { category: 'Energy', energyType: 'Normal' }) };
      }

      throw new Error(`Unexpected url: ${url}`);
    });

    const result = await searchCards(
      {
        selectedCategory: 'Energy',
        selectedEnergyTypes: ['Basic'],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      'en',
      1,
      3,
    );

    expect(result.cards.map((card) => card.id)).toEqual(['001', '003']);
    expect(result.hasMore).toBe(false);
  });
});
