import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_A = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const USER_B = '83bbbc2e-bf31-4f95-ad71-df9f7c8e3f21';

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

import { GET } from './route';

function user(id: string) {
  return { id, email: `${id}@example.test`, user_metadata: { name: id === USER_A ? 'Ash' : 'Misty' } };
}

describe('/api/profile ownership', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset();
    mockEnsureNeonUser.mockReset().mockResolvedValue(undefined);
    mockSql.mockReset();
  });

  it('scopes profile reads to each authenticated principal', async () => {
    mockGetNeonUserFromRequest
      .mockResolvedValueOnce(user(USER_A))
      .mockResolvedValueOnce(user(USER_B));
    mockSql
      .mockResolvedValueOnce([{ public_handle: 'ash', is_public: true }])
      .mockResolvedValueOnce([{ public_handle: 'misty', is_public: false }]);

    const first = await GET(new NextRequest('https://lunidex.test/api/profile'));
    const second = await GET(new NextRequest('https://lunidex.test/api/profile'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(first.json()).resolves.toEqual({
      profile: { public_handle: 'ash', is_public: true },
    });
    await expect(second.json()).resolves.toEqual({
      profile: { public_handle: 'misty', is_public: false },
    });
    expect(mockSql.mock.calls[0]?.slice(1)).toContain(USER_A);
    expect(mockSql.mock.calls[1]?.slice(1)).toContain(USER_B);
  });
});
