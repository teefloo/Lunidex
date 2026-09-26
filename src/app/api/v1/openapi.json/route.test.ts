import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('public API OpenAPI contract', () => {
  it('documents the published methods, bearer security, schemas, and quotas', async () => {
    const response = await GET();
    const document = await response.json() as {
      info: { description: string };
      paths: Record<string, Record<string, { security?: unknown[]; responses?: Record<string, unknown> }>>;
      components: { schemas: Record<string, { properties?: Record<string, { minimum?: number }> }> };
    };

    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(document.paths['/openapi.json'].get.security).toEqual([]);
    expect(document.paths['/me'].get.security).toEqual([{ BearerApiKey: [] }]);
    expect(document.paths['/cards/{cardId}']).toHaveProperty('put');
    expect(document.paths['/sealed/transactions/{id}/void']).toHaveProperty('post');
    expect(document.paths['/sealed/transactions'].post.responses).toHaveProperty('201');
    expect(document.paths['/sealed/transactions'].post.responses).not.toHaveProperty('200');
    expect(document.info.description).toContain('60 reads/minute');
    expect(document.info.description).toContain('5,000 operations/day');
    expect(document.components.schemas.CardQuantityWrite.properties?.quantity.minimum).toBe(0);
    expect(document.components.schemas.ErrorEnvelope).toBeDefined();
  });
});
