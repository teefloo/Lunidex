import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockAuthGetUser = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockSingle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  bearerToken: (authorization: string | null) => authorization?.replace(/^Bearer\s+/i, '') ?? null,
  getSupabaseServerClient: mockGetSupabaseServerClient,
  isSupabaseConfiguredServer: true,
}));

import { GET, POST } from './route';

describe('battle room route', () => {
  beforeEach(() => {
    mockAuthGetUser.mockReset();
    mockInsert.mockReset();
    mockSelect.mockReset();
    mockSingle.mockReset();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'trainer-1' } } });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockGetSupabaseServerClient.mockReset();
    mockGetSupabaseServerClient.mockReturnValue({
      auth: { getUser: mockAuthGetUser },
      from: () => ({ insert: mockInsert }),
    });
  });

  it('stores only canonical Pokémon IDs and discards no arbitrary client fields', async () => {
    mockSingle.mockResolvedValue({ data: { id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534', status: 'waiting', created_at: '2026-07-28' }, error: null });
    const request = new NextRequest('http://localhost/api/battle/room', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ team: [{ id: 25 }] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith({
      player1_id: 'trainer-1',
      player1_team: [{ id: 25 }],
      status: 'waiting',
    });
  });

  it('rejects arbitrary member state before persistence', async () => {
    const request = new NextRequest('http://localhost/api/battle/room', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ team: [{ id: 25, state: { arbitrary: true } }] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects malformed room IDs before querying Supabase', async () => {
    const request = new NextRequest('http://localhost/api/battle/room?id=not-a-uuid', {
      headers: { authorization: 'Bearer signed-token' },
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
