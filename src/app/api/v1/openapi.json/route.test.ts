import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('public API OpenAPI contract', () => {
  it('documents the published methods, bearer security, schemas, and quotas', async () => {
    const response = await GET();
    const document = await response.json() as {
      info: { description: string };
      paths: Record<string, Record<string, {
        security?: unknown[];
        parameters?: Array<Record<string, unknown>>;
        requestBody?: { content?: Record<string, { schema?: { $ref?: string } }> };
        responses?: Record<string, {
          description?: string;
          headers?: Record<string, unknown>;
          content?: Record<string, {
            example?: unknown;
            examples?: Record<string, { value?: unknown }>;
          }>;
        }>;
      }>>;
      components: { schemas: Record<string, {
        required?: string[];
        properties?: Record<string, { minimum?: number }>;
      }> };
    };

    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(document.paths['/openapi.json'].get.security).toEqual([]);
    expect(document.paths['/me'].get.security).toEqual([{ BearerApiKey: [] }]);
    expect(document.paths['/cards/{cardId}']).toHaveProperty('put');
    expect(document.paths['/sealed/transactions/{id}/void']).toHaveProperty('post');
    expect(document.paths['/sealed/transactions'].post.responses).toHaveProperty('201');
    expect(document.paths['/sealed/transactions'].post.responses).toHaveProperty('200');
    expect(document.info.description).toContain('60 reads/minute');
    expect(document.info.description).toContain('5,000 operations/day');
    expect(document.components.schemas.CardQuantityWrite.properties?.quantity.minimum).toBe(0);
    expect(document.components.schemas.ErrorEnvelope).toBeDefined();
  });

  it('pairs each documented error response with an example for that HTTP status', async () => {
    const response = await GET();
    const document = await response.json() as {
      paths: Record<string, Record<string, { responses?: Record<string, {
        headers?: Record<string, unknown>;
        content?: Record<string, {
          example?: unknown;
          examples?: Record<string, { value?: unknown }>;
        }>;
      }> }>>;
    };
    const responses = document.paths['/me'].get.responses ?? {};
    const expectedCodes: Record<string, string> = {
      '400': 'VALIDATION_ERROR',
      '401': 'INVALID_API_KEY',
      '403': 'INSUFFICIENT_PERMISSION',
      '404': 'NOT_FOUND',
      '409': 'CURSOR_STALE',
      '410': 'ACCOUNT_UNAVAILABLE',
      '422': 'VALIDATION_ERROR',
      '429': 'RATE_LIMITED',
      '500': 'INTERNAL_ERROR',
      '502': 'CARD_DATA_UNAVAILABLE',
      '503': 'API_UNAVAILABLE',
    };

    for (const [status, code] of Object.entries(expectedCodes)) {
      const content = responses[status]?.content?.['application/json'];
      const representative = content?.example ?? content?.examples?.primary?.value;
      expect(representative)
        .toMatchObject({ error: { code } });
      if (content?.examples) expect(content).not.toHaveProperty('example');
    }
    expect(responses['429']?.headers).toHaveProperty('Retry-After');

    const errorCodes = (status: string) => Object.values(
      responses[status]?.content?.['application/json']?.examples ?? {},
    ).map((entry) => (entry.value as { error?: { code?: string } }).error?.code);
    expect(errorCodes('404')).toContain('CARD_NOT_FOUND');
    expect(errorCodes('409')).toEqual(expect.arrayContaining([
      'CONFLICT', 'AMBIGUOUS_OWNERSHIP', 'STATE_CONFLICT',
    ]));
    expect(errorCodes('422')).toEqual(expect.arrayContaining([
      'IDEMPOTENCY_KEY_REQUIRED', 'INVALID_CARD', 'VARIANT_UNAVAILABLE',
      'COLLECTION_LIMIT_REACHED', 'INVALID_COLLECTION',
    ]));
    expect(errorCodes('429')).toContain('RATE_LIMITED');
    expect(errorCodes('500')).toContain('INVALID_SAVED_STATE');
  });

  it('documents idempotent transaction replays and PATCH revision requirements', async () => {
    const response = await GET();
    const document = await response.json() as {
      paths: Record<string, Record<string, {
        requestBody?: { content?: Record<string, { schema?: { $ref?: string } }> };
        responses?: Record<string, { content?: Record<string, { example?: unknown }> }>;
      }>>;
      components: { schemas: Record<string, { required?: string[] }> };
    };
    const transactionWrite = document.paths['/sealed/transactions'].post;
    const transactionPatch = document.paths['/sealed/transactions/{id}'].patch;

    expect(transactionWrite.responses?.['200']?.content?.['application/json']?.example)
      .toMatchObject({ data: { replayed: true } });
    expect(transactionWrite.responses?.['201']?.content?.['application/json']?.example)
      .toMatchObject({ data: { replayed: false } });
    expect(transactionPatch.requestBody?.content?.['application/json']?.schema?.$ref)
      .toBe('#/components/schemas/SealedTransactionUpdateWrite');
    expect(document.components.schemas.SealedTransactionUpdateWrite.required).toContain('revision');
    expect(document.components.schemas.SealedTransactionWrite.required).not.toContain('revision');
  });
});
