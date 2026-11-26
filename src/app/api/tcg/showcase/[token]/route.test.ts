import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSupabaseDatabaseClient: vi.fn(),
  getTCGCardLocalizedCached: vi.fn(),
  rateLimit: vi.fn(),
  ipKey: vi.fn(),
  rows: [] as unknown[],
  sql: vi.fn(),
}));

vi.mock('@/lib/supabase/database', () => ({ getSupabaseDatabaseClient: mocks.getSupabaseDatabaseClient }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGCardLocalizedCached: mocks.getTCGCardLocalizedCached }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rateLimit, ipKey: mocks.ipKey }));

import { GET } from './route';

const token = 'A'.repeat(43);
const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';

function userState() {
  return {
    email: 'private@example.com',
    tcgCustomCollections: [{ id: collectionId, name: 'Trade binder', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }],
    tcgCustomCollectionCards: [{ collectionId, cardId: 'sv1-1', language: 'en', cardName: 'Bulbasaur', addedAt: '2026-01-02T00:00:00.000Z', quantity: 7 }],
  };
}

describe('public TCG collection showcase route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [];
    mocks.sql.mockImplementation(async () => mocks.rows);
    mocks.getSupabaseDatabaseClient.mockReturnValue(mocks.sql);
    mocks.getTCGCardLocalizedCached.mockResolvedValue({
      id: 'sv1-1', localId: '1', name: 'Bulbasaur', image: 'https://assets.tcgdex.net/en/sv/sv1/1/low.webp',
    });
    mocks.rateLimit.mockReturnValue(true);
    mocks.ipKey.mockReturnValue('127.0.0.1');
  });

  it('returns only the binder projection and keeps quantities/prices hidden by default', async () => {
    mocks.rows = [{
      collection_id: collectionId,
      show_quantities: false,
      show_prices: false,
      data: userState(),
    }];
    const request = new NextRequest(`https://lunidex.app/api/tcg/showcase/${token}`);
    const response = await GET(request, { params: Promise.resolve({ token }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body.collection).toEqual({ name: 'Trade binder', description: '' });
    expect(body.cards[0]).toEqual(expect.objectContaining({ id: 'sv1-1', name: 'Bulbasaur' }));
    expect(body.cards[0]).not.toHaveProperty('quantity');
    expect(body.cards[0]).not.toHaveProperty('price');
    expect(JSON.stringify(body)).not.toContain('private@example.com');
    expect(JSON.stringify(body)).not.toContain(token);
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.sql.mock.calls[0]?.[1]).toBe(createHash('sha256').update(token).digest('hex'));
    expect(mocks.getTCGCardLocalizedCached).toHaveBeenCalledWith('sv1-1', 'en');
  });

  it('keeps the binder language and reference name when localized card detail is unavailable', async () => {
    mocks.rows = [{
      collection_id: collectionId,
      show_quantities: false,
      show_prices: false,
      data: {
        ...userState(),
        tcgCustomCollectionCards: [{
          collectionId,
          cardId: 'sv1-1',
          language: 'fr',
          cardName: 'Bulbizarre',
          addedAt: '2026-01-02T00:00:00.000Z',
          quantity: 7,
        }],
      },
    }];
    mocks.getTCGCardLocalizedCached.mockRejectedValue(new Error('Localized detail unavailable'));

    const request = new NextRequest(`https://lunidex.app/api/tcg/showcase/${token}`);
    const response = await GET(request, { params: Promise.resolve({ token }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getTCGCardLocalizedCached).toHaveBeenCalledWith('sv1-1', 'fr');
    expect(body.cards[0]).toEqual(expect.objectContaining({
      id: 'sv1-1',
      language: 'fr',
      name: 'Bulbizarre',
      localId: null,
      setName: null,
      image: null,
    }));
    expect(body.cards[0].name).not.toBe('Bulbasaur');
  });

  it('returns a no-store 404 after the share token has been revoked', async () => {
    mocks.rows = [];
    const request = new NextRequest(`https://lunidex.app/api/tcg/showcase/${token}`);
    const response = await GET(request, { params: Promise.resolve({ token }) });

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('adds prices and physical quantities only after the owner enables both scopes', async () => {
    mocks.rows = [{
      collection_id: collectionId,
      show_quantities: true,
      show_prices: true,
      data: userState(),
    }];
    mocks.getTCGCardLocalizedCached.mockResolvedValue({
      id: 'sv1-1',
      localId: '1',
      name: 'Bulbasaur',
      variants: { normal: true },
      pricing: { cardmarket: { unit: 'EUR', trend: 2.5, updated: '2026-11-01T00:00:00.000Z' } },
    });
    const request = new NextRequest(`https://lunidex.app/api/tcg/showcase/${token}`);
    const response = await GET(request, { params: Promise.resolve({ token }) });
    const body = await response.json();

    expect(body.cards[0]).toMatchObject({
      quantity: 7,
      price: { amount: 2.5, currency: 'EUR', source: 'cardmarket', updatedAt: '2026-11-01T00:00:00.000Z' },
    });
  });

  it('rejects malformed tokens before looking up a share', async () => {
    const malformedToken = 'not-a-share-token';
    const request = new NextRequest(`https://lunidex.app/api/tcg/showcase/${malformedToken}`);
    const response = await GET(request, { params: Promise.resolve({ token: malformedToken }) });

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
