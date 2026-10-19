import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), getCachedData: vi.fn(), setCachedData: vi.fn() }));

vi.mock('axios', () => ({ default: { create: vi.fn(() => ({ get: mocks.get })) } }));
vi.mock('axios-retry', () => ({
  default: Object.assign(vi.fn(), { exponentialDelay: vi.fn(), isNetworkOrIdempotentRequestError: vi.fn() }),
}));
vi.mock('@/lib/sentry-observability', () => ({
  attachAxiosSentryInstrumentation: vi.fn(),
  reportFallback: vi.fn(),
  reportHttpFailure: vi.fn(),
}));
vi.mock('./cache', () => ({ getCachedData: mocks.getCachedData, setCachedData: mocks.setCachedData }));

import { getTCGIllustratorCards, getTCGIllustrators } from './tcg';

describe('TCGdex illustrator API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedData.mockResolvedValue(null);
    mocks.setCachedData.mockResolvedValue(undefined);
  });

  it('loads valid credits from the language-specific illustrator index', async () => {
    mocks.get.mockResolvedValue({ data: ['Shinji Kanda', 'N/A', '  ', 'Shinji Kanda'] });

    await expect(getTCGIllustrators('ru')).resolves.toEqual(['Shinji Kanda']);
    expect(mocks.get).toHaveBeenCalledWith('/ru/illustrators');
  });

  it('loads cards for the exact credit and rejects a response for another artist', async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        name: 'shinji kanda',
        cards: [{ id: 'swsh11-186', localId: '186', name: 'Giratina V', image: 'https://assets.tcgdex.net/en/swsh/swsh11/186' }],
      },
    });

    const cards = await getTCGIllustratorCards('Shinji Kanda', 'en');
    expect(cards.map(({ id, name, illustrator }) => ({ id, name, illustrator }))).toEqual([
      { id: 'swsh11-186', name: 'Giratina V', illustrator: 'Shinji Kanda' },
    ]);
    expect(mocks.get).toHaveBeenCalledWith('/en/illustrators/Shinji%20Kanda');

    mocks.get.mockResolvedValueOnce({ data: { name: 'another artist', cards: [] } });
    await expect(getTCGIllustratorCards('Shinji Kanda', 'fr')).rejects.toThrow(/illustrator/i);
  });

  it('rejects malformed index and card payloads instead of reporting empty results', async () => {
    mocks.get.mockResolvedValueOnce({ data: { illustrators: [] } });
    await expect(getTCGIllustrators('ko')).rejects.toThrow(/illustrator/i);

    mocks.get.mockResolvedValueOnce({ data: { name: 'shinji kanda', cards: [{ id: 'only-an-id' }] } });
    await expect(getTCGIllustratorCards('Shinji Kanda', 'it')).rejects.toThrow(/card/i);
  });

  it('keeps real cards when optional summary fields are missing', async () => {
    mocks.get.mockResolvedValueOnce({ data: {
      name: 'test artist',
      cards: [{ id: 'sv4-111', name: 'Snorlax', localId: null, image: null }],
    } });

    await expect(getTCGIllustratorCards('Test Artist', 'es')).resolves.toMatchObject([
      { id: 'sv4-111', localId: '111', image: undefined, name: 'Snorlax' },
    ]);
  });

  it('keeps case-only credit variants as separate exact lookups', async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { name: 'Artist', cards: [{ id: 'sv4-111', name: 'Snorlax' }] } })
      .mockResolvedValueOnce({ data: { name: 'artist', cards: [{ id: 'sv4-112', name: 'Pikachu' }] } });

    const upper = await getTCGIllustratorCards('Artist', 'de');
    const lower = await getTCGIllustratorCards('artist', 'de');

    expect(mocks.get).toHaveBeenNthCalledWith(1, '/de/illustrators/Artist');
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/de/illustrators/artist');
    expect(upper.map(({ id }) => id)).toEqual(['sv4-111']);
    expect(lower.map(({ id }) => id)).toEqual(['sv4-112']);
  });

  it('deduplicates concurrent identical index and card-list requests', async () => {
    let resolveIndex!: (response: { data: unknown }) => void;
    mocks.get.mockImplementation(() => new Promise((resolve) => { resolveIndex = resolve; }));
    const indexA = getTCGIllustrators('pt');
    const indexB = getTCGIllustrators('pt');
    await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    resolveIndex({ data: ['Concurrent Artist'] });
    await expect(Promise.all([indexA, indexB])).resolves.toEqual([
      ['Concurrent Artist'],
      ['Concurrent Artist'],
    ]);

    mocks.get.mockClear();
    let resolveCards!: (response: { data: unknown }) => void;
    mocks.get.mockImplementation(() => new Promise((resolve) => { resolveCards = resolve; }));
    const cardsA = getTCGIllustratorCards('Concurrent Artist', 'pt');
    const cardsB = getTCGIllustratorCards('Concurrent Artist', 'pt');
    await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    resolveCards({ data: {
      name: 'Concurrent Artist',
      cards: [{ id: 'sv4-113', name: 'Eevee' }],
    } });
    const [first, second] = await Promise.all([cardsA, cardsB]);
    expect(first.map(({ id }) => id)).toEqual(['sv4-113']);
    expect(second.map(({ id }) => id)).toEqual(['sv4-113']);
    expect(mocks.get).toHaveBeenCalledOnce();
  });
});
