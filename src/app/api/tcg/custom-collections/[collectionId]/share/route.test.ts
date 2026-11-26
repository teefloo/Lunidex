import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSupabaseDatabaseClient: vi.fn(),
  getSupabaseUserFromRequest: vi.fn(),
  ensureSupabaseUser: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@/lib/supabase/database', () => ({ getSupabaseDatabaseClient: mocks.getSupabaseDatabaseClient }));
vi.mock('@/lib/supabase/auth', () => ({
  getSupabaseUserFromRequest: mocks.getSupabaseUserFromRequest,
  ensureSupabaseUser: mocks.ensureSupabaseUser,
}));
vi.mock('@/lib/api/observed-route', () => ({
  withObservedRouteHandler: (_route: string, _feature: string, handler: (...args: never[]) => unknown) => handler,
}));

import { DELETE } from './route';

const userId = '36b8f84d-df4e-4d49-b662-bcde71a8764f';
const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const invokeDelete = DELETE as unknown as (
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> },
) => Promise<Response>;

describe('owner TCG collection share controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sql.mockResolvedValue([]);
    mocks.getSupabaseDatabaseClient.mockReturnValue(mocks.sql);
    mocks.getSupabaseUserFromRequest.mockResolvedValue({ id: userId, email: 'owner@example.com', user_metadata: {} });
    mocks.ensureSupabaseUser.mockResolvedValue(true);
  });

  it('deletes the owner-scoped share immediately and returns no-store settings', async () => {
    const request = new NextRequest(`https://lunidex.app/api/tcg/custom-collections/${collectionId}/share`, {
      method: 'DELETE',
      headers: { origin: 'https://lunidex.app' },
    });
    const response = await invokeDelete(request, { params: Promise.resolve({ collectionId }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body).toEqual({ active: false, showQuantities: false, showPrices: false });
    const query = mocks.sql.mock.calls[0]?.[0]?.join('');
    expect(query).toContain('delete from public.tcg_collection_shares');
    expect(mocks.sql.mock.calls[0]?.[1]).toBe(userId);
    expect(mocks.sql.mock.calls[0]?.[2]).toBe(collectionId);
  });

  it('does not write a share revocation for an unauthenticated request', async () => {
    mocks.getSupabaseUserFromRequest.mockResolvedValue(null);
    const request = new NextRequest(`https://lunidex.app/api/tcg/custom-collections/${collectionId}/share`, {
      method: 'DELETE',
      headers: { origin: 'https://lunidex.app' },
    });
    const response = await invokeDelete(request, { params: Promise.resolve({ collectionId }) });

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
