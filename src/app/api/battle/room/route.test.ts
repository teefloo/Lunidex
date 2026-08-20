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

  it('keeps finished rooms closed to foreign joins while preserving participant reloads', async () => {
    const playerOne = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
    const foreignUser = '83bbbc2e-bf31-4f95-ad71-df9f7c8e3f21';
    const roomId = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
    mockGetNeonUserFromRequest
      .mockResolvedValueOnce({ id: foreignUser, email: 'misty@example.test', user_metadata: { name: 'Misty' } })
      .mockResolvedValueOnce({ id: playerOne, email: 'ash@example.test', user_metadata: { name: 'Ash' } });
    mockSql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: roomId,
        player1_id: playerOne,
        player2_id: null,
        status: 'finished',
        state: {},
        created_at: '2026-07-28',
      }]);

    const joinRequest = (authorization: string) => new NextRequest(`http://localhost/api/battle/room?id=${roomId}`, {
      method: 'PATCH',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'join' }),
    });

    const foreignResponse = await PATCH(joinRequest('Bearer foreign-token'));
    const participantResponse = await PATCH(joinRequest('Bearer participant-token'));

    expect(foreignResponse.status).toBe(404);
    expect(participantResponse.status).toBe(200);
    const joinSql = String(mockSql.mock.calls[0]?.[0]?.join(' '));
    expect(joinSql).toContain("status = 'waiting'");
    expect(joinSql).toContain('player1_id is not null');
    expect(joinSql).toContain('in (player1_id, player2_id)');
  });
});
