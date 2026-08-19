import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
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
});
