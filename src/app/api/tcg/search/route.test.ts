import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSearchCards = vi.hoisted(() => vi.fn());
const mockGetFilterOptions = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/tcg', () => ({
  getFilterOptions: mockGetFilterOptions,
  normalizeTcgPositiveInteger: (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    const normalized = Math.floor(value);
    return normalized >= 1 ? normalized : fallback;
  },
  searchCards: mockSearchCards,
}));

vi.mock('@/lib/rate-limit', () => ({
  ipKey: () => 'test',
  rateLimit: () => true,
}));

import { GET } from './route';

describe('/api/tcg/search input bounds', () => {
  beforeEach(() => {
    mockSearchCards.mockReset().mockResolvedValue({ cards: [], hasMore: false });
    mockGetFilterOptions.mockReset().mockResolvedValue({});
  });

  it('caps page and limit before invoking the catalog client', async () => {
    const request = new NextRequest(
      'https://lunidex.test/api/tcg/search?page=999999999&limit=999999999',
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSearchCards).toHaveBeenCalledWith(
      expect.any(Object),
      'en',
      100,
      96,
    );
  });
});
