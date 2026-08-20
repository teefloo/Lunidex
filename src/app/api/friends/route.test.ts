import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const FRIEND_ID = 'd3b07384-d113-4ec7-8a2d-1c3e4f5a6b7c';
const FRIENDSHIP_ID = '4f2a9b7e-4c32-4f84-9d11-8a3f6b7c2d10';

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

import { PATCH, POST } from './route';

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

const baseFriendship: FriendshipRow = {
  id: FRIENDSHIP_ID,
  requester_id: USER_ID,
  addressee_id: FRIEND_ID,
  status: 'pending',
  created_at: '2026-08-13T10:00:00.000Z',
  updated_at: '2026-08-13T10:00:00.000Z',
  responded_at: null,
};

const relationRow = (status: FriendshipRow['status']): FriendshipRow & {
  other_user_id: string;
  other_handle: string;
  other_display_name: string;
  other_allow_friend_requests: boolean;
  other_share_tcg_collection: boolean;
  other_share_tcg_decks: boolean;
} => ({
  ...baseFriendship,
  status,
  responded_at: status === 'pending' ? null : '2026-08-13T10:05:00.000Z',
  other_user_id: FRIEND_ID,
  other_handle: 'misty',
  other_display_name: 'Misty',
  other_allow_friend_requests: true,
  other_share_tcg_collection: false,
  other_share_tcg_decks: false,
});

function request(body: unknown): NextRequest {
  return new NextRequest('https://lunidex.test/api/friends', {
    method: 'POST',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest('https://lunidex.test/api/friends', {
    method: 'PATCH',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function queryText(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray;
  return Array.from(strings).join(' ');
}

function queryValues(call: unknown[]): unknown[] {
  return call.slice(1);
}

type TaggedQuery = (strings: TemplateStringsArray, ...values: unknown[]) => unknown;

describe('POST /api/friends', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset();
    mockEnsureNeonUser.mockReset();
    mockSql.mockReset();
    mockSql.transaction.mockReset();
    mockGetNeonUserFromRequest.mockResolvedValue({
      id: USER_ID,
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockResolvedValue(undefined);
  });

  it.each([
    ['accept', 'accepted'],
    ['decline', 'declined'],
  ] as const)('maps %s to the SQL %s state', async (command, expectedStatus) => {
    mockSql
      .mockResolvedValueOnce([{ ...baseFriendship, status: 'pending' }])
      .mockResolvedValueOnce([relationRow(expectedStatus)]);

    const response = await POST(request({
      action: 'respond',
      friendshipId: FRIENDSHIP_ID,
      response: command,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ relation: { status: expectedStatus } });
    const updateCall = mockSql.mock.calls[0] as unknown[];
    expect(queryText(updateCall)).toContain('update public.friendships');
    expect(queryValues(updateCall)[0]).toBe(expectedStatus);
  });

  it('binds friendship responses to the authenticated principal', async () => {
    const otherUserId = '83bbbc2e-bf31-4f95-ad71-df9f7c8e3f21';
    mockGetNeonUserFromRequest
      .mockResolvedValueOnce({ id: USER_ID, email: 'ash@example.test', user_metadata: { name: 'Ash' } })
      .mockResolvedValueOnce({ id: otherUserId, email: 'misty@example.test', user_metadata: { name: 'Misty' } });
    mockSql
      .mockResolvedValueOnce([{ ...baseFriendship, status: 'accepted' }])
      .mockResolvedValueOnce([relationRow('accepted')])
      .mockResolvedValueOnce([{ ...baseFriendship, status: 'accepted' }])
      .mockResolvedValueOnce([relationRow('accepted')]);

    const first = await POST(request({
      action: 'respond',
      friendshipId: FRIENDSHIP_ID,
      response: 'accept',
    }));
    const second = await POST(request({
      action: 'respond',
      friendshipId: FRIENDSHIP_ID,
      response: 'accept',
    }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(queryValues(mockSql.mock.calls[0] as unknown[])).toContain(USER_ID);
    expect(queryValues(mockSql.mock.calls[2] as unknown[])).toContain(otherUserId);
  });

  it('does not let the requester respond to their own outgoing request', async () => {
    mockSql.mockResolvedValueOnce([]);

    const response = await POST(request({
      action: 'respond',
      friendshipId: FRIENDSHIP_ID,
      response: 'accept',
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Friend request not found' });
    const updateCall = mockSql.mock.calls[0] as unknown[];
    expect(queryText(updateCall)).toContain('addressee_id =');
    expect(queryText(updateCall)).toContain("status = 'pending'");
  });

  it('replaces a declined request when sending a new request', async () => {
    mockSql
      .mockResolvedValueOnce([{ user_id: FRIEND_ID }])
      .mockResolvedValueOnce([{ ...baseFriendship, status: 'declined', responded_at: '2026-08-12T10:00:00.000Z' }])
      .mockResolvedValueOnce([relationRow('pending')]);
    mockSql.transaction.mockResolvedValueOnce([
      [{ id: FRIENDSHIP_ID }],
      [{ ...baseFriendship, status: 'pending', responded_at: null }],
    ]);

    const response = await POST(request({ action: 'send', handle: 'misty' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ relation: { status: 'pending' } });
    const replaceCall = mockSql.transaction.mock.calls[0] as unknown[];
    const transactionQueries: unknown[][] = [];
    const buildQueries = replaceCall[0] as (tx: TaggedQuery) => unknown[];
    buildQueries((strings, ...values) => {
      transactionQueries.push([strings, ...values]);
      return {};
    });
    expect(queryText(transactionQueries[0] as unknown[])).toContain('delete from public.friendships');
    expect(queryText(transactionQueries[1] as unknown[])).toContain('insert into public.friendships');
    expect(queryText(transactionQueries[0] as unknown[])).toContain("status = 'declined'");
    expect(queryText(transactionQueries[1] as unknown[])).not.toContain('set requester_id =');
  });

  it('does not send a request to a handle that cannot receive requests', async () => {
    mockSql.mockResolvedValueOnce([]);

    const response = await POST(request({ action: 'send', handle: 'private-trainer' }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Friend handle not found' });
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('returns a controlled deletion response when friendship mutation races deletion', async () => {
    mockSql.mockRejectedValueOnce({ code: 'P0001', message: 'Account is not active' });

    const response = await POST(request({
      action: 'respond',
      friendshipId: FRIENDSHIP_ID,
      response: 'accept',
    }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: 'Account deletion is in progress' });
  });

  it('returns a controlled deletion response when privacy mutation races deletion', async () => {
    mockSql.mockRejectedValueOnce({ code: 'P0001', message: 'Account is not active' });

    const response = await PATCH(patchRequest({
      action: 'privacy',
      settings: {
        allowFriendRequests: true,
        shareTcgCollection: false,
        shareTcgDecks: false,
      },
    }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: 'Account deletion is in progress' });
  });
});
