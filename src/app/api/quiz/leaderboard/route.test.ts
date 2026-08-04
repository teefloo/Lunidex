import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetNeonUserFromRequest = vi.hoisted(() => vi.fn());
const mockEnsureNeonUser = vi.hoisted(() => vi.fn());
const mockSql = vi.hoisted(() => Object.assign(vi.fn(), { transaction: vi.fn() }));

vi.mock('@/lib/neon/auth', () => ({
  ensureNeonUser: mockEnsureNeonUser,
  getNeonUserFromRequest: mockGetNeonUserFromRequest,
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => mockSql,
}));

vi.mock('@/lib/rate-limit', () => ({
  ipKey: () => 'test',
  rateLimit: () => true,
}));

import { POST } from './route';

describe('POST /api/quiz/leaderboard', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset();
    mockEnsureNeonUser.mockReset();
    mockSql.mockReset();
    mockSql.transaction.mockReset();
    mockGetNeonUserFromRequest.mockResolvedValue({
      id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534',
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockResolvedValue(undefined);
  });

  it('uses an atomic Neon transaction instead of client-controlled row fields', async () => {
    mockSql.transaction.mockResolvedValue([[{ score: 10 }], []]);
    const request = new NextRequest('http://localhost/api/quiz/leaderboard', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'time-attack', challenge: 'classic', score: 9999, user_id: 'victim' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, score: 10, improved: true });
    expect(mockSql.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed scores before invoking the Neon transaction', async () => {
    const request = new NextRequest('http://localhost/api/quiz/leaderboard', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'marathon', challenge: 'classic', score: 'not-a-score' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockSql.transaction).not.toHaveBeenCalled();
  });
});
