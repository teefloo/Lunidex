import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verifySupabaseUserFromRequest: vi.fn(),
  getSupabaseDatabaseClient: vi.fn(),
  ensureSupabaseUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server-auth', () => ({
  verifySupabaseUserFromRequest: mocks.verifySupabaseUserFromRequest,
}));
vi.mock('@/lib/supabase/auth', () => ({ ensureSupabaseUser: mocks.ensureSupabaseUser }));
vi.mock('@/lib/supabase/database', () => ({ getSupabaseDatabaseClient: mocks.getSupabaseDatabaseClient }));

import { GET } from './route';

describe('temporary owner access endpoint', () => {
  beforeEach(() => {
    mocks.verifySupabaseUserFromRequest.mockReset();
    mocks.getSupabaseDatabaseClient.mockReset();
    mocks.ensureSupabaseUser.mockReset();
  });

  it('returns only a generic denial for a non-allowlisted or unverified session', async () => {
    mocks.verifySupabaseUserFromRequest.mockResolvedValue({ status: 'denied' });

    const response = await GET(new NextRequest('https://lunidex.app/api/auth/access'));

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ allowed: false });
    expect(mocks.getSupabaseDatabaseClient).not.toHaveBeenCalled();
    expect(mocks.ensureSupabaseUser).not.toHaveBeenCalled();
  });

  it('surfaces Auth provider failures as unavailable instead of treating them as a logged-out session', async () => {
    mocks.verifySupabaseUserFromRequest.mockResolvedValue({ status: 'unavailable' });

    const response = await GET(new NextRequest('https://lunidex.app/api/auth/access'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ allowed: false });
    expect(mocks.ensureSupabaseUser).not.toHaveBeenCalled();
  });

  it('provisions the allowlisted verified identity idempotently before allowing app access', async () => {
    const user = {
      id: '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660',
      email: 'owner@example.test',
      user_metadata: {},
    };
    const sql = {};
    mocks.verifySupabaseUserFromRequest.mockResolvedValue({ status: 'allowed', user });
    mocks.getSupabaseDatabaseClient.mockReturnValue(sql);
    mocks.ensureSupabaseUser.mockResolvedValue(true);

    const response = await GET(new NextRequest('https://lunidex.app/api/auth/access'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ allowed: true });
    expect(mocks.ensureSupabaseUser).toHaveBeenCalledWith(sql, user);
  });

  it('fails closed if first-login provisioning cannot complete', async () => {
    mocks.verifySupabaseUserFromRequest.mockResolvedValue({ status: 'allowed', user: {
      id: '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660',
      email: 'owner@example.test',
      user_metadata: {},
    } });
    mocks.getSupabaseDatabaseClient.mockReturnValue({});
    mocks.ensureSupabaseUser.mockRejectedValue(new Error('database unavailable'));

    const response = await GET(new NextRequest('https://lunidex.app/api/auth/access'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ allowed: false });
  });
});
