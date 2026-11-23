import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNeonClient: vi.fn(),
  query: vi.fn(),
  sql: { query: vi.fn() },
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: mocks.getNeonClient,
  isNeonConfiguredServer: true,
}));

import { GET } from './route';

describe('sitemap index', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.sql.query = mocks.query;
    mocks.getNeonClient.mockReturnValue(mocks.sql);
  });

  it('omits sealed-product sitemaps when their data source is unavailable', async () => {
    const error = new Error('Neon project quota exceeded');
    mocks.query.mockRejectedValue(error);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await GET();
    const sitemap = await response.text();

    expect(response.status).toBe(200);
    expect(sitemap).not.toContain('/sitemaps/sealed-products');
    expect(sitemap).toContain('/sitemaps/pokemon.xml');
    expect(warning).toHaveBeenCalledWith(
      '[sitemap-index] omitting sealed-product sitemaps because the data source is unavailable',
      error,
    );
  });

  it('includes sealed-product sitemaps when the source query returns products', async () => {
    mocks.query.mockResolvedValue([{ cardmarket_product_id: 123 }]);

    const response = await GET();
    const sitemap = await response.text();

    expect(response.status).toBe(200);
    expect(sitemap).toContain('/sitemaps/sealed-products.xml');
    expect(sitemap).toContain('/sitemaps/sealed-products-fr.xml');
  });
});
