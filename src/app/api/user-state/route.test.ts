import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const OTHER_USER_ID = '83bbbc2e-bf31-4f95-ad71-df9f7c8e3f21';
const UPDATED_AT = '2026-08-15 12:34:56.123456+00';

const mockGetNeonUserFromRequest = vi.hoisted(() => vi.fn());
const mockEnsureNeonUser = vi.hoisted(() => vi.fn());
const mockSql = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/auth', () => ({
  ensureNeonUser: mockEnsureNeonUser,
  getNeonUserFromRequest: mockGetNeonUserFromRequest,
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => mockSql,
}));

import { GET, PUT } from './route';

function queryText(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray;
  return Array.from(strings).join(' ');
}

describe('/api/user-state timestamp precision', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset().mockResolvedValue({
      id: USER_ID,
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockReset().mockResolvedValue(undefined);
    mockSql.mockReset();
  });

  it('returns the database timestamp as text without losing microseconds', async () => {
    mockSql.mockResolvedValueOnce([{ data: { tcgOwnedCards: [] }, updated_at: UPDATED_AT }]);

    const response = await GET(new NextRequest('https://lunidex.test/api/user-state'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { tcgOwnedCards: [] },
      updatedAt: UPDATED_AT,
    });
    expect(queryText(mockSql.mock.calls[0] as unknown[])).toContain('updated_at::text as updated_at');
  });

  it('scopes state reads to the authenticated principal', async () => {
    mockGetNeonUserFromRequest
      .mockResolvedValueOnce({ id: USER_ID, email: 'ash@example.test', user_metadata: { name: 'Ash' } })
      .mockResolvedValueOnce({ id: OTHER_USER_ID, email: 'misty@example.test', user_metadata: { name: 'Misty' } });
    mockSql
      .mockResolvedValueOnce([{ data: { owner: 'ash' }, updated_at: UPDATED_AT }])
      .mockResolvedValueOnce([{ data: { owner: 'misty' }, updated_at: UPDATED_AT }]);

    const first = await GET(new NextRequest('https://lunidex.test/api/user-state'));
    const second = await GET(new NextRequest('https://lunidex.test/api/user-state'));

    await expect(first.json()).resolves.toMatchObject({ data: { owner: 'ash' } });
    await expect(second.json()).resolves.toMatchObject({ data: { owner: 'misty' } });
    expect(mockSql.mock.calls[0]?.slice(1)).toContain(USER_ID);
    expect(mockSql.mock.calls[1]?.slice(1)).toContain(OTHER_USER_ID);
  });

  it('compares and returns the same precise timestamp on a card-state write', async () => {
    mockSql.mockResolvedValueOnce([{ data: { tcgOwnedCards: ['sv01-1'] }, updated_at: UPDATED_AT }]);

    const response = await PUT(new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { origin: 'https://lunidex.test', 'content-type': 'application/json' },
      body: JSON.stringify({
        data: { tcgOwnedCards: ['sv01-1'] },
        expectedUpdatedAt: UPDATED_AT,
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ updatedAt: UPDATED_AT });
    expect(queryText(mockSql.mock.calls[0] as unknown[])).toContain('updated_at::text as updated_at');
  });

  it('canonicalizes and deduplicates the TCG collection before persisting it', async () => {
    mockSql.mockResolvedValueOnce([{ data: { tcgOwnedCards: ['sv01-1'] }, updated_at: UPDATED_AT }]);

    const response = await PUT(new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { origin: 'https://lunidex.test', 'content-type': 'application/json' },
      body: JSON.stringify({ data: { tcgOwnedCards: [' SV01-1 ', 'sv01-1'] } }),
    }));

    expect(response.status).toBe(200);
    expect(mockSql.mock.calls[0]).toContain(JSON.stringify({ tcgOwnedCards: ['sv01-1'] }));
  });

  it('rejects malformed TCG identifiers before reaching the database', async () => {
    const response = await PUT(new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { origin: 'https://lunidex.test', 'content-type': 'application/json' },
      body: JSON.stringify({ data: { tcgOwnedCards: ['not a card'] } }),
    }));

    expect(response.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('blocks reads and writes while account deletion is pending', async () => {
    mockEnsureNeonUser.mockResolvedValue(false);

    const readResponse = await GET(new NextRequest('https://lunidex.test/api/user-state'));
    const writeResponse = await PUT(new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { origin: 'https://lunidex.test', 'content-type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    }));

    expect(readResponse.status).toBe(410);
    expect(writeResponse.status).toBe(410);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns a controlled deletion response when the database guard wins a race', async () => {
    mockSql.mockRejectedValueOnce({ code: 'P0001' });

    const response = await PUT(new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { origin: 'https://lunidex.test', 'content-type': 'application/json' },
      body: JSON.stringify({ data: { tcgOwnedCards: ['sv01-1'] } }),
    }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: 'Account deletion is in progress' });
  });
});
