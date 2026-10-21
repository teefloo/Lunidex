import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';

const mocks = vi.hoisted(() => ({ indexes: vi.fn(), summaries: vi.fn(), card: vi.fn() }));

vi.mock('@/lib/api/server-cache', () => ({
  getTCGIllustratorsCached: mocks.indexes,
  getTCGIllustratorCardsCached: mocks.summaries,
  getTCGCardLocalizedCached: mocks.card,
}));

import { loadTCGIllustratorGallery } from './tcg-illustrator-gallery';

function card(id: string, illustrator?: string): TCGCard {
  return { id, localId: id.slice(id.lastIndexOf('-') + 1), name: `Card ${id}`, illustrator };
}

describe('TCG illustrator gallery loader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses exact artist credits, deduplicates the count, and hydrates only the requested page', async () => {
    const summaries = Array.from({ length: 25 }, (_, index) => card(`card-${String(index + 1).padStart(2, '0')}`));
    mocks.indexes.mockImplementation(async (lang: string) => lang === 'en' ? ['Saino Misaki', 'saino misaki'] : []);
    mocks.summaries.mockImplementation(async (name: string) => name === 'Saino Misaki' ? summaries : [summaries[0]]);
    mocks.card.mockImplementation(async (id: string) => card(id, 'Saino Misaki'));

    const gallery = await loadTCGIllustratorGallery('SAINO MISAKI', 'en', 2);

    expect(gallery?.artist).toBe('Saino Misaki');
    expect(gallery?.total).toBe(25);
    expect(gallery?.cards.map(({ id }) => id)).toEqual(['card-25']);
    expect(mocks.card).toHaveBeenCalledTimes(1);
    expect(mocks.summaries).toHaveBeenCalledTimes(2);
  });

  it('recognizes a regional-only artist but reports no cards in the selected language', async () => {
    mocks.indexes.mockImplementation(async (lang: string) => lang === 'ja' ? ['YU NAGABA'] : []);

    const gallery = await loadTCGIllustratorGallery('yu nagaba', 'fr', 1);

    expect(gallery).toMatchObject({ artist: 'YU NAGABA', total: 0, cards: [] });
    expect(mocks.summaries).not.toHaveBeenCalled();
  });

  it('returns a retryable unavailable result when the illustrator index fails', async () => {
    mocks.indexes.mockRejectedValue(new Error('TCGdex is temporarily unavailable'));

    const gallery = await loadTCGIllustratorGallery('Shinji Kanda', 'en', 1);

    expect(gallery).toMatchObject({
      artist: 'Shinji Kanda',
      total: 0,
      cards: [],
      isUnavailable: true,
    });
  });

  it('returns a retryable unavailable result when an illustrator card index fails', async () => {
    mocks.indexes.mockImplementation(async (lang: string) => lang === 'en' ? ['Shinji Kanda'] : []);
    mocks.summaries.mockRejectedValue(new Error('TCGdex is temporarily unavailable'));

    const gallery = await loadTCGIllustratorGallery('shinji kanda', 'en', 1);

    expect(gallery).toMatchObject({
      artist: 'Shinji Kanda',
      total: 0,
      cards: [],
      isUnavailable: true,
    });
  });

  it('returns null for an unknown credit and rejects contradictory card attribution', async () => {
    mocks.indexes.mockResolvedValue([]);
    await expect(loadTCGIllustratorGallery('unknown artist', 'en', 1)).resolves.toBeNull();

    mocks.indexes.mockImplementation(async (lang: string) => lang === 'en' ? ['Shinji Kanda'] : []);
    mocks.summaries.mockResolvedValue([card('swsh11-186')]);
    mocks.card.mockResolvedValue(card('swsh11-186', 'Mitsuhiro Arita'));
    await expect(loadTCGIllustratorGallery('shinji kanda', 'en', 1)).rejects.toThrow(/attribution/i);
  });

  it('treats an explicit unknown detail credit as missing and keeps the index attribution', async () => {
    mocks.indexes.mockImplementation(async (lang: string) => lang === 'en' ? ['Shinji Kanda'] : []);
    mocks.summaries.mockResolvedValue([card('swsh11-186')]);
    mocks.card.mockResolvedValue(card('swsh11-186', 'N/A'));

    const gallery = await loadTCGIllustratorGallery('shinji kanda', 'en', 1);
    expect(gallery?.cards[0]?.illustrator).toBe('Shinji Kanda');
  });

  it('uses the actual summary when detail hydration fails and marks the page incomplete', async () => {
    mocks.indexes.mockImplementation(async (lang: string) => lang === 'en' ? ['Shinji Kanda'] : []);
    mocks.summaries.mockResolvedValue([card('swsh11-186')]);
    mocks.card.mockRejectedValue(new Error('temporary upstream failure'));

    const gallery = await loadTCGIllustratorGallery('shinji kanda', 'en', 1);

    expect(gallery?.cards).toEqual([card('swsh11-186', 'Shinji Kanda')]);
    expect(gallery?.hasUnavailableDetails).toBe(true);
  });

  it('limits cross-language lookup to four requests and card hydration to eight', async () => {
    let activeIndexes = 0;
    let maximumIndexes = 0;
    mocks.indexes.mockImplementation(async (lang: string) => {
      activeIndexes += 1;
      maximumIndexes = Math.max(maximumIndexes, activeIndexes);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeIndexes -= 1;
      return lang === 'ja' ? ['Regional Artist'] : [];
    });
    await loadTCGIllustratorGallery('missing artist', 'fr', 1);
    expect(maximumIndexes).toBeLessThanOrEqual(4);

    let activeCards = 0;
    let maximumCards = 0;
    const summaries = Array.from({ length: 24 }, (_, index) => card(`many-${index + 1}`));
    mocks.indexes.mockImplementation(async (lang: string) => lang === 'en' ? ['Busy Artist'] : []);
    mocks.summaries.mockResolvedValue(summaries);
    mocks.card.mockImplementation(async (id: string) => {
      activeCards += 1;
      maximumCards = Math.max(maximumCards, activeCards);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeCards -= 1;
      return card(id, 'Busy Artist');
    });
    await loadTCGIllustratorGallery('busy artist', 'en', 1);
    expect(maximumCards).toBeLessThanOrEqual(8);
  });
});
