import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  graphqlPost: vi.fn(),
  restGet: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

vi.mock('./client', () => ({
  default: { get: mocks.restGet },
  graphqlClient: { post: mocks.graphqlPost },
}));

vi.mock('./cache', () => ({
  getCachedData: mocks.cacheGet,
  setCachedData: mocks.cacheSet,
}));

vi.mock('@/lib/sentry-observability', () => ({
  reportFallback: vi.fn(),
}));

import { getItemDetail } from './graphql';

describe('getItemDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheGet.mockResolvedValue(undefined);
    mocks.cacheSet.mockResolvedValue(undefined);
  });

  it('falls back to the localized REST resource after a GraphQL rate limit', async () => {
    mocks.graphqlPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    mocks.restGet.mockResolvedValue({
      data: {
        id: 1,
        name: 'master-ball',
        cost: 0,
        category: { name: 'standard-balls' },
        names: [
          { name: 'Master Ball', language: { name: 'en' } },
          { name: 'Master Ball FR', language: { name: 'fr' } },
        ],
        effect_entries: [
          { effect: 'English effect', short_effect: 'English short', language: { name: 'en' } },
          { effect: 'Effet français', short_effect: 'Effet court', language: { name: 'fr' } },
        ],
        flavor_text_entries: [
          { text: 'English flavor', language: { name: 'en' } },
          { text: 'Description française', language: { name: 'fr' } },
        ],
      },
    });

    await expect(getItemDetail('master-ball', 5)).resolves.toEqual({
      id: 1,
      name: 'master-ball',
      cost: 0,
      pokemon_v2_itemcategory: { name: 'standard-balls' },
      pokemon_v2_itemnames: [{ name: 'Master Ball FR' }],
      pokemon_v2_itemeffecttexts: [{ effect: 'Effet français', short_effect: 'Effet court' }],
      pokemon_v2_itemflavortexts: [{ flavor_text: 'Description française' }],
    });

    expect(mocks.graphqlPost).toHaveBeenCalledWith(
      '/v1beta2',
      expect.objectContaining({ variables: { name: 'master-ball', languageId: 5 } }),
      expect.objectContaining({ timeout: 10000, 'axios-retry': { retries: 0 } }),
    );
    expect(mocks.restGet).toHaveBeenCalledWith('/item/master-ball');
    expect(mocks.cacheSet).toHaveBeenCalledWith(
      'graphql-v1beta2:item-detail-v1-master-ball-5',
      expect.objectContaining({ pokemon_v2_itemnames: [{ name: 'Master Ball FR' }] }),
    );
  });

  it('falls back to REST when GraphQL returns a validation error with HTTP 200', async () => {
    mocks.graphqlPost.mockResolvedValue({
      data: {
        data: null,
        errors: [{ message: "field 'cost' not found in type: 'item'" }],
      },
    });
    mocks.restGet.mockResolvedValue({
      data: {
        id: 934,
        name: 'contest-costume--dress',
        cost: 0,
        category: { name: 'unused' },
        names: [{ name: 'Vestito Live', language: { name: 'it' } }],
        effect_entries: [{
          effect: 'Abito da gara',
          short_effect: 'Abito elegante',
          language: { name: 'it' },
        }],
        flavor_text_entries: [{ text: 'Grazioso vestito.', language: { name: 'it' } }],
      },
    });

    await expect(getItemDetail('contest-costume--dress', 8)).resolves.toEqual({
      id: 934,
      name: 'contest-costume--dress',
      cost: 0,
      pokemon_v2_itemcategory: { name: 'unused' },
      pokemon_v2_itemnames: [{ name: 'Vestito Live' }],
      pokemon_v2_itemeffecttexts: [{ effect: 'Abito da gara', short_effect: 'Abito elegante' }],
      pokemon_v2_itemflavortexts: [{ flavor_text: 'Grazioso vestito.' }],
    });
    expect(mocks.restGet).toHaveBeenCalledWith('/item/contest-costume--dress');
  });

  it('keeps successful GraphQL item lookups on the existing path', async () => {
    const item = {
      id: 1,
      name: 'master-ball',
      cost: 0,
      pokemon_v2_itemcategory: { name: 'standard-balls' },
      pokemon_v2_itemnames: [{ name: 'Master Ball' }],
      pokemon_v2_itemeffecttexts: [{ effect: 'Effect', short_effect: 'Short effect' }],
      pokemon_v2_itemflavortexts: [{ flavor_text: 'Flavor' }],
    };
    mocks.graphqlPost.mockResolvedValue({ data: { data: { pokemon_v2_item: [item] } } });

    await expect(getItemDetail('master-ball', 9)).resolves.toEqual(item);
    expect(mocks.restGet).not.toHaveBeenCalled();
    expect(mocks.cacheSet).toHaveBeenCalledWith('graphql-v1beta2:item-detail-v1-master-ball-9', item);
  });
});
