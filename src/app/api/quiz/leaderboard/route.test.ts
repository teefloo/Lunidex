import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockAuthGetUser = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  bearerToken: (authorization: string | null) => authorization?.replace(/^Bearer\s+/i, '') ?? null,
  getSupabaseServerClient: mockGetSupabaseServerClient,
  isSupabaseConfiguredServer: true,
}));

vi.mock('@/lib/rate-limit', () => ({
  ipKey: () => 'test',
  rateLimit: () => true,
}));

import { POST } from './route';

describe('POST /api/quiz/leaderboard', () => {
  beforeEach(() => {
    mockAuthGetUser.mockReset();
    mockRpc.mockReset();
    mockGetSupabaseServerClient.mockReset();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'trainer-1', email: 'ash@example.test', user_metadata: { name: 'Ash' } } },
      error: null,
    });
    mockGetSupabaseServerClient.mockReturnValue({ auth: { getUser: mockAuthGetUser }, rpc: mockRpc });
  });

  it('uses the atomic server-owned submission RPC instead of client-controlled row fields', async () => {
    mockRpc.mockResolvedValue({ data: [{ score: 10, improved: true }], error: null });
    const request = new NextRequest('http://localhost/api/quiz/leaderboard', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'time-attack', challenge: 'classic', score: 9999, user_id: 'victim' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, score: 10, improved: true });
    expect(mockRpc).toHaveBeenCalledWith('submit_quiz_score', {
      p_mode: 'time-attack',
      p_challenge: 'classic',
      p_score: 100,
      p_pseudo: 'Ash',
    });
  });

  it('rejects malformed scores before invoking the submission RPC', async () => {
    const request = new NextRequest('http://localhost/api/quiz/leaderboard', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'marathon', challenge: 'classic', score: 'not-a-score' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
