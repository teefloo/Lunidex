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

describe('/api/account/export ownership', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset();
    mockEnsureNeonUser.mockReset().mockResolvedValue(undefined);
    mockSql.mockReset().mockResolvedValue([]);
  });

  it('uses only the authenticated principal for every exported relation', async () => {
    mockGetNeonUserFromRequest
      .mockResolvedValueOnce(user(USER_A))
      .mockResolvedValueOnce(user(USER_B));

    const first = await GET(new NextRequest('https://lunidex.test/api/account/export'));
    const firstCalls = mockSql.mock.calls.slice(0, 10);
    const second = await GET(new NextRequest('https://lunidex.test/api/account/export'));
    const secondCalls = mockSql.mock.calls.slice(10, 20);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ account: { id: USER_A } });
    await expect(second.json()).resolves.toMatchObject({ account: { id: USER_B } });
    expect(firstCalls).toHaveLength(10);
    expect(secondCalls).toHaveLength(10);
    expect(firstCalls.every((call) => call.slice(1).includes(USER_A))).toBe(true);
    expect(secondCalls.every((call) => call.slice(1).includes(USER_B))).toBe(true);
  });
});
