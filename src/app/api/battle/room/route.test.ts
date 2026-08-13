import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

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

import { GET, PATCH, POST } from './route';

describe('battle room route', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset();
    mockEnsureNeonUser.mockReset();
    mockSql.mockReset();
    mockGetNeonUserFromRequest.mockResolvedValue({ id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534', email: 'ash@example.test', user_metadata: { name: 'Ash' } });
    mockEnsureNeonUser.mockResolvedValue(undefined);
  });

  it('stores only canonical Pokémon IDs and discards no arbitrary client fields', async () => {
    mockSql.mockResolvedValue([{ id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534', status: 'waiting', created_at: '2026-07-28' }]);
    const request = new NextRequest('http://localhost/api/battle/room', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ team: [{ id: 25 }] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSql).toHaveBeenCalled();
    expect(String(mockSql.mock.calls[0]?.[0]?.[0])).toContain('insert into public.battle_rooms');
  });

  it('rejects arbitrary member state before persistence', async () => {
    const request = new NextRequest('http://localhost/api/battle/room', {
      method: 'POST',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ team: [{ id: 25, state: { arbitrary: true } }] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects malformed room IDs before querying Neon', async () => {
    const request = new NextRequest('http://localhost/api/battle/room?id=not-a-uuid', {
      headers: { authorization: 'Bearer signed-token' },
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('bounds persisted chat history while keeping the participant check in SQL', async () => {
    mockSql.mockResolvedValue([{
      id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534',
      player1_id: '72aaab1d-ae20-4ee0-9c60-cf8e8580f534',
      player2_id: null,
      status: 'waiting',
      state: { chat: [] },
      created_at: '2026-07-28',
    }]);
    const request = new NextRequest('http://localhost/api/battle/room?id=72aaab1d-ae20-4ee0-9c60-cf8e8580f534', {
      method: 'PATCH',
      headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'chat', text: 'Ready!' }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const sqlText = mockSql.mock.calls[0]?.[0]?.join('') ?? '';
    expect(sqlText).toContain('jsonb_array_elements');
    expect(sqlText).toContain('jsonb_array_length');
    expect(sqlText).toContain('in (player1_id, player2_id)');
  });
});
