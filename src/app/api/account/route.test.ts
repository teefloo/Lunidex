import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';

const mockGetNeonUserFromRequest = vi.hoisted(() => vi.fn());
const mockEnsureNeonUser = vi.hoisted(() => vi.fn());
const mockSql = vi.hoisted(() => Object.assign(vi.fn(), { transaction: vi.fn() }));
const mockDeleteNeonAuthUser = vi.hoisted(() => vi.fn());
const mockGetNeonAuthServer = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/auth', () => ({
  ensureNeonUser: mockEnsureNeonUser,
  getNeonUserFromRequest: mockGetNeonUserFromRequest,
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => mockSql,
}));

vi.mock('@/lib/neon/server-auth', () => ({
  deleteNeonAuthUser: mockDeleteNeonAuthUser,
  getNeonAuthServer: mockGetNeonAuthServer,
}));

import { DELETE } from './route';

function request(body: unknown): NextRequest {
  return new NextRequest('https://lunidex.test/api/account', {
    method: 'DELETE',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function successfulProviderResponse(): { success: boolean; response: Response } {
  return {
    success: true,
    response: new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Set-Cookie': 'neon-auth.session_token=; Max-Age=0; Path=/' },
    }),
  };
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset().mockResolvedValue({
      id: USER_ID,
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockReset().mockResolvedValue(true);
    mockSql.mockReset();
    mockSql.transaction.mockReset();
    mockGetNeonAuthServer.mockReset().mockReturnValue({});
    mockDeleteNeonAuthUser.mockReset();
  });

  it('deletes application data, deletes the provider account, and marks a terminal tombstone', async () => {
    mockSql
      .mockResolvedValueOnce([{ deletion_state: 'active' }])
      .mockResolvedValueOnce([{ deletion_state: 'pending' }])
      .mockResolvedValueOnce([]);
    mockSql.transaction
      .mockResolvedValueOnce([[{ id: USER_ID }]])
      .mockResolvedValueOnce([]);
    mockDeleteNeonAuthUser.mockResolvedValueOnce(successfulProviderResponse());

    const response = await DELETE(request({ confirmation: 'DELETE', password: 'correct-password' }));

    expect(response.status).toBe(204);
    expect(mockDeleteNeonAuthUser).toHaveBeenCalledWith(expect.anything(), 'correct-password');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(mockSql.transaction).toHaveBeenCalledTimes(2);
    const cleanupBuilder = mockSql.transaction.mock.calls[1]?.[0] as (tx: (strings: TemplateStringsArray, ...values: unknown[]) => unknown) => unknown[];
    const cleanupQueries: string[] = [];
    cleanupBuilder((strings) => {
      cleanupQueries.push(Array.from(strings).join(' '));
      return {};
    });
    expect(cleanupQueries.join(' ')).toContain('delete from public.user_state');
    expect(cleanupQueries.join(' ')).toContain('delete from public.profiles');
    expect(cleanupQueries.join(' ')).toContain('delete from public.quiz_attempts');
    expect(mockSql.mock.calls.at(-1)?.[0]?.join(' ')).toContain("deletion_state = 'deleted'");
  });

  it('moves the account to a durable pending state when the provider fails', async () => {
    mockSql
      .mockResolvedValueOnce([{ deletion_state: 'active' }])
      .mockResolvedValueOnce([{ deletion_state: 'pending' }]);
    mockSql.transaction
      .mockResolvedValueOnce([[{ id: USER_ID }]])
      .mockResolvedValueOnce([]);
    mockDeleteNeonAuthUser.mockResolvedValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: 'provider unavailable' }), { status: 502 }),
    });

    const response = await DELETE(request({ confirmation: 'DELETE' }));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ deletion: 'pending' });
    expect(mockSql.transaction).toHaveBeenCalledTimes(2);
    expect(mockSql.mock.calls.at(-1)?.[0]?.join(' ')).not.toContain("deletion_state = 'deleted'");
  });

  it('retries a pending deletion idempotently', async () => {
    mockSql
      .mockResolvedValueOnce([{ deletion_state: 'active' }])
      .mockResolvedValueOnce([{ deletion_state: 'pending' }])
      .mockResolvedValueOnce([{ deletion_state: 'pending' }])
      .mockResolvedValueOnce([]);
    mockSql.transaction
      .mockResolvedValueOnce([[{ id: USER_ID }]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDeleteNeonAuthUser
      .mockResolvedValueOnce({ success: false, response: new Response(null, { status: 502 }) })
      .mockResolvedValueOnce(successfulProviderResponse());

    expect((await DELETE(request({ confirmation: 'DELETE' }))).status).toBe(202);
    expect((await DELETE(request({ confirmation: 'DELETE', password: 'correct-password' }))).status).toBe(204);
    expect(mockDeleteNeonAuthUser).toHaveBeenCalledTimes(2);
  });

  it('treats a terminal tombstone as an idempotent success', async () => {
    mockSql.mockResolvedValueOnce([{ deletion_state: 'deleted' }]);

    const response = await DELETE(request({ confirmation: 'DELETE' }));

    expect(response.status).toBe(204);
    expect(mockDeleteNeonAuthUser).not.toHaveBeenCalled();
    expect(mockSql.transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid confirmation before authenticating or mutating', async () => {
    const response = await DELETE(request({ confirmation: 'delete' }));

    expect(response.status).toBe(400);
    expect(mockGetNeonUserFromRequest).not.toHaveBeenCalled();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated deletion', async () => {
    mockGetNeonUserFromRequest.mockResolvedValueOnce(null);

    const response = await DELETE(request({ confirmation: 'DELETE' }));

    expect(response.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects cookie-style deletion without a trusted origin', async () => {
    const noOriginRequest = new NextRequest('https://lunidex.test/api/account', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });

    const response = await DELETE(noOriginRequest);

    expect(response.status).toBe(403);
  });
});
