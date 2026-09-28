import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { NeonSql } from '@/lib/neon/server';

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  searchPublicSealedCatalogue: vi.fn(),
}));

vi.mock('@/lib/public-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/public-api')>();
  return {
    ...actual,
    runPublicApi: async (...args: Parameters<typeof actual.runPublicApi>) => {
      const handler = args[4];
      return handler({
        sql: mocks.sql as unknown as NeonSql,
        userId: '00000000-0000-4000-8000-000000000001',
        keyId: '00000000-0000-4000-8000-000000000002',
        permission: 'read',
      });
    },
  };
});

vi.mock('@/lib/tcg-sealed-server', () => ({
  searchPublicSealedCatalogue: mocks.searchPublicSealedCatalogue,
}));

import { GET } from './route';

describe('public sealed catalogue route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sql.mockResolvedValue([{ revision: 'catalogue-revision' }]);
    mocks.searchPublicSealedCatalogue.mockResolvedValue({
      products: [],
      prices: [],
      total: 0,
      page: 0,
      pageSize: 24,
    });
  });

  it('rejects a query longer than 150 Unicode characters', async () => {
    const request = new NextRequest(`https://lunidex.app/api/v1/sealed/catalogue?q=${encodeURIComponent('𐐀'.repeat(151))}`);

    const response = await GET(request);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(mocks.sql).not.toHaveBeenCalled();
    expect(mocks.searchPublicSealedCatalogue).not.toHaveBeenCalled();
  });

  it('preserves all 150 Unicode characters at the query limit', async () => {
    const query = '𐐀'.repeat(150);
    const request = new NextRequest(`https://lunidex.app/api/v1/sealed/catalogue?q=${encodeURIComponent(query)}`);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.searchPublicSealedCatalogue).toHaveBeenCalledWith(expect.anything(), query, 0, 24);
  });
});
