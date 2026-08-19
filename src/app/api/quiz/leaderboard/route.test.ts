import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const ATTEMPT_ID = '4f2a9b7e-4c32-4f84-9d11-8a3f6b7c2d10';

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

import { GET, POST } from './route';

function request(body: unknown): NextRequest {
  return new NextRequest('https://lunidex.test/api/quiz/leaderboard', {
    method: 'POST',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/quiz/leaderboard', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset().mockResolvedValue({
      id: USER_ID,
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockReset().mockResolvedValue(undefined);
    mockSql.mockReset();
    mockSql.transaction.mockReset();
  });

  it('persists only the score derived from a completed server attempt', async () => {
    mockSql.transaction.mockResolvedValueOnce([[{ score: 7, improved: true }]]);

    const response = await POST(request({ attemptId: ATTEMPT_ID }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, score: 7, improved: true });
    const transactionBuilder = mockSql.transaction.mock.calls[0]?.[0] as (tx: (strings: TemplateStringsArray, ...values: unknown[]) => unknown) => unknown[];
    const queries: unknown[][] = [];
    transactionBuilder((strings, ...values) => {
      queries.push([strings, ...values]);
      return {};
    });
    expect(String((queries[0]?.[0] as TemplateStringsArray).join(' '))).toContain('update public.quiz_attempts');
    expect(String((queries[0]?.[0] as TemplateStringsArray).join(' '))).toContain("status = 'completed'");
  });

  it.each([9999, -100, Number.POSITIVE_INFINITY, Number.NaN])('rejects client-supplied score %s without touching Neon', async (score) => {
    const response = await POST(request({ mode: 'marathon', challenge: 'classic', score }));

    expect(response.status).toBe(400);
    expect(mockSql.transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing attempt', async () => {
    mockSql.transaction.mockResolvedValueOnce([[]]);
    mockSql.mockResolvedValueOnce([]);

    const response = await POST(request({ attemptId: ATTEMPT_ID }));

    expect(response.status).toBe(404);
  });

  it('rejects an unfinished attempt', async () => {
    mockSql.transaction.mockResolvedValueOnce([[]]);
    mockSql.mockResolvedValueOnce([{
      status: 'active',
      answer_index: 4,
      question_count: 10,
      wrong_answers: 1,
      date: '2026-08-20',
    }]);

    const response = await POST(request({ attemptId: ATTEMPT_ID }));

    expect(response.status).toBe(409);
  });

  it('rejects replay of an already completed attempt', async () => {
    mockSql.transaction.mockResolvedValueOnce([[]]);
    mockSql.mockResolvedValueOnce([{
      status: 'completed',
      answer_index: 10,
      question_count: 10,
      wrong_answers: 0,
      date: '2026-08-20',
    }]);

    const response = await POST(request({ attemptId: ATTEMPT_ID }));

    expect(response.status).toBe(409);
  });

  it('does not allow a different user to claim an attempt', async () => {
    mockSql.transaction.mockResolvedValueOnce([[]]);
    mockSql.mockResolvedValueOnce([]);

    const response = await POST(request({ attemptId: ATTEMPT_ID }));

    expect(response.status).toBe(404);
  });

  it('allows only one of two concurrent finalizations to claim an attempt', async () => {
    mockSql.transaction
      .mockResolvedValueOnce([[{ score: 10, improved: true }]])
      .mockResolvedValueOnce([[]]);
    mockSql.mockResolvedValueOnce([{
      status: 'completed',
      answer_index: 10,
      question_count: 10,
      wrong_answers: 0,
      date: '2026-08-20',
    }]);

    const [first, second] = await Promise.all([
      POST(request({ attemptId: ATTEMPT_ID })),
      POST(request({ attemptId: ATTEMPT_ID })),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  it('keeps personalized reads private and uncacheable', async () => {
    mockSql.mockResolvedValueOnce([]);
    mockGetNeonUserFromRequest.mockResolvedValueOnce(null);

    const response = await GET(new NextRequest('https://lunidex.test/api/quiz/leaderboard?period=day'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
