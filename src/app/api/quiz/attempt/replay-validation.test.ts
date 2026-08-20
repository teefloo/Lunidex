import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const ATTEMPT_ID = '4f2a9b7e-4c32-4f84-9d11-8a3f6b7c2d10';

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

vi.mock('@/lib/rate-limit', () => ({
  ipKey: () => 'test',
  rateLimit: () => true,
}));

import { POST } from './route';

function request(): NextRequest {
  return new NextRequest('https://lunidex.test/api/quiz/attempt', {
    method: 'POST',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'start', mode: 'marathon', challenge: 'classic' }),
  });
}

describe('daily quiz attempt replay validation', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockResolvedValue({
      id: USER_ID,
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockResolvedValue(undefined);
    mockSql.mockReset();
  });

  it('rejects a second daily start for the same user/date at the unique constraint', async () => {
    mockSql
      .mockResolvedValueOnce([{ id: ATTEMPT_ID, question_id: 25 }])
      .mockRejectedValueOnce({ code: '23505' });

    const first = await POST(request());
    const second = await POST(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    const firstBody = await first.json() as { attemptId: string };
    expect(firstBody.attemptId).toBe(ATTEMPT_ID);
    await expect(second.json()).resolves.toEqual({
      error: 'A daily quiz attempt already exists for this account',
    });
    expect(mockSql).toHaveBeenCalledTimes(2);
    expect(String(mockSql.mock.calls[0]?.[0]?.join(' '))).toContain('insert into public.quiz_attempts');
  });
});
