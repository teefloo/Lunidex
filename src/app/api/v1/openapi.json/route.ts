import { NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';

const errorResponse = {
  description: 'API error',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorEnvelope' },
      examples: {
        unauthorized: { value: { error: { code: 'INVALID_API_KEY', message: 'A valid Lunidex API key is required.' } } },
        validation: { value: { error: { code: 'VALIDATION_ERROR', message: 'The request is invalid.' } } },
        conflict: { value: { error: { code: 'CONFLICT', message: 'The resource changed. Reload and try again.' } } },
        rateLimited: { value: { error: { code: 'RATE_LIMITED', message: 'The API quota has been reached.' } } },
      },
    },
  },
};

const privateErrorResponses = {
  '400': errorResponse,
  '401': errorResponse,
  '403': errorResponse,
  '404': errorResponse,
  '409': errorResponse,
  '422': errorResponse,
  '429': { ...errorResponse, description: 'Quota exceeded; includes Retry-After.' },
  '410': errorResponse,
  '500': errorResponse,
  '503': errorResponse,
};

const privateResponses = {
  '200': {
    description: 'Successful response',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' } } },
  },
  ...privateErrorResponses,
};

const secured = (summary: string, extra: Record<string, unknown> = {}) => ({
  summary,
  security: [{ BearerApiKey: [] }],
  responses: privateResponses,
  ...extra,
});

const specification = {
  openapi: '3.1.0',
  info: {
    title: 'Lunidex Public API',
    version: '1.0.0',
    description: [
      'API for data synchronized to a Lunidex account. Local-only device data is not available.',
      'Card collection responses never contain card valuations. Sealed amounts are integer EUR cents.',
      'Quotas per account: 60 reads/minute, 10 writes/minute, 1,000 reads/day, 100 writes/day.',
      'Card detail and sealed calculations: 100 reads/day per account and 5,000 operations/day globally for each category.',
      'Lists default to 25 entries and accept up to 100, except catalogue search, fixed at 24.',
      'Private responses use Cache-Control: private, no-store. API keys are for server-side integrations.',
    ].join('\n\n'),
  },
  servers: [{ url: '/api/v1' }],
  security: [{ BearerApiKey: [] }],
  paths: {
    '/openapi.json': {
      get: {
        summary: 'OpenAPI document',
        security: [],
        responses: { '200': { description: 'This OpenAPI specification.' } },
      },
    },
    '/me': {
      get: secured('Current account identity', {
        responses: { ...privateResponses, '200': {
          description: 'Limited account identity; no email address.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: { id: '00000000-0000-4000-8000-000000000001', handle: 'trainer', memberSince: '2026-01-01T00:00:00Z' } } } },
        } },
      }),
    },
    '/summary': {
      get: secured('Account summary, card counts, and sealed totals', {
        responses: { ...privateResponses, '200': {
          description: 'Account statistics. Sealed value is null when any held product has no price.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: { account: { id: '00000000-0000-4000-8000-000000000001', handle: 'trainer', memberSince: '2026-01-01T00:00:00Z' }, statistics: { pokemonCaught: 140, quizBestScore: 12, cards: { physical: 42, distinct: 31 }, sealed: { units: 3, distinct: 2, costCents: 5800, valueCents: null, missingPrices: 1, currency: 'EUR' } } }, meta: { sealedRevision: 8, priceRevision: 12 } } } },
        } },
      }),
    },
    '/cards': {
      get: secured('List owned card variants', {
        parameters: [
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'language', in: 'query', schema: { type: 'string' } },
          { name: 'set', in: 'query', schema: { type: 'string' } },
        ],
        responses: { ...privateResponses, '200': {
          description: 'Paged card holdings; cursor becomes 409 after collection changes.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: [{ cardId: 'base1-001', setId: 'base1', language: 'en', variant: 'normal', quantity: 2 }], meta: { limit: 25, total: 1, nextCursor: null } } } },
        } },
      }),
    },
    '/cards/{cardId}': {
      parameters: [{ name: 'cardId', in: 'path', required: true, schema: { type: 'string' } }],
      get: secured('Card metadata and this account’s holdings; no price fields', {
        parameters: [{ name: 'language', in: 'query', schema: { type: 'string' } }],
        responses: { ...privateResponses, '200': {
          description: 'Metadata and holdings for a card owned by this account; card values are excluded.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: { card: { id: 'base1-001', name: 'Example', rarity: 'Rare', set: { id: 'base1', name: 'Base Set' } }, holdings: [{ cardId: 'base1-001', setId: 'base1', language: 'en', variant: 'normal', quantity: 2 }] } } } },
        } },
      }),
      put: secured('Set an absolute card variant quantity', {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CardQuantityWrite' }, example: { language: 'en', variant: 'reverse', quantity: 2 } } },
        },
        responses: { ...privateResponses, '200': {
          description: 'Absolute possession quantity after the update.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: { holding: { cardId: 'base1-001', setId: 'base1', language: 'en', variant: 'reverse', quantity: 2 }, updatedAt: '2026-09-26T10:00:00Z' } } } },
        } },
      }),
    },
    '/sealed/catalogue': {
      get: secured('Search the Cardmarket sealed product catalogue', {
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 150 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: { ...privateResponses, '200': {
          description: 'At most 24 catalogue products per page.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: [{ cardmarketProductId: 12345, name: 'Booster Box', categoryId: 1, categoryName: 'Display', expansionId: 7, cardmarketUrl: 'https://www.cardmarket.com/', imageAvailable: true }], meta: { limit: 24, total: 1, nextCursor: null } } } },
        } },
      }),
    },
    '/sealed/positions': {
      get: secured('List current sealed positions and stored market valuations', {
        parameters: [
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'language', in: 'query', schema: { type: 'string', enum: ['unknown', 'en', 'fr', 'es', 'de', 'it', 'ja'] } },
          { name: 'productId', in: 'query', schema: { type: 'integer', minimum: 1 } },
        ],
        responses: { ...privateResponses, '200': {
          description: 'Current positions with EUR-cent cost and current market value; missing prices are null.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: [{ product: { cardmarketProductId: 12345, name: 'Booster Box' }, language: 'en', quantity: 2, costCents: 5000, valueCents: null, missingPrice: true }], meta: { limit: 25, revision: 5, priceRevision: 7, nextCursor: null } } } },
        } },
      }),
    },
    '/sealed/positions/{productId}': {
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      get: secured('Current position for one sealed product', {
        responses: { ...privateResponses, '200': {
          description: 'Current language positions for a product owned by the authenticated account.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: { product: { cardmarketProductId: 12345, name: 'Booster Box' }, positions: [{ language: 'en', quantity: 2, costCents: 5000, valueCents: 6200, missingPrice: false }] }, meta: { revision: 5, priceRevision: 7 } } } },
        } },
      }),
    },
    '/sealed/transactions': {
      get: secured('List the private sealed transaction journal', {
        parameters: [
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'language', in: 'query', schema: { type: 'string' } },
          { name: 'productId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['buy', 'sell', 'exchange'] } },
          { name: 'includeVoided', in: 'query', schema: { type: 'boolean', default: false } },
          { name: 'voided', in: 'query', schema: { type: 'boolean', description: 'Filter for only voided or only active transactions.' } },
        ],
        responses: { ...privateResponses, '200': {
          description: 'A private, revisioned, cursor-paginated journal.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: [{ id: '00000000-0000-4000-8000-000000000002', revision: 1, kind: 'buy', cardmarketProductId: 12345, date: '2026-09-26', quantity: 1, unitPriceCents: 2500, voided: false }], meta: { limit: 25, revision: 5, nextCursor: null } } } },
        } },
      }),
      post: secured('Create a buy, sell, or exchange transaction', {
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SealedTransactionWrite' }, example: { expectedRevision: 4, kind: 'buy', cardmarketProductId: 12345, language: 'en', date: '2026-09-26', quantity: 1, unitPriceCents: 2500 } } },
        },
        responses: { ...privateErrorResponses, '201': {
          description: 'Created; a repeated idempotency key returns the original result.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' } } },
        } },
      }),
    },
    '/sealed/transactions/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: secured('Get one private sealed transaction', {
        responses: { ...privateResponses, '200': {
          description: 'The transaction, if it belongs to the authenticated account.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' }, example: { data: { id: '00000000-0000-4000-8000-000000000002', revision: 1, kind: 'buy', cardmarketProductId: 12345, date: '2026-09-26', quantity: 1, unitPriceCents: 2500, voided: false } } } },
        } },
      }),
      patch: secured('Revise a sealed transaction using optimistic revisions', {
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SealedTransactionWrite' } } } },
      }),
    },
    '/sealed/transactions/{id}/void': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: secured('Void a sealed transaction', {
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VoidTransactionWrite' }, example: { revision: 1, expectedRevision: 5 } } } },
      }),
    },
  },
  components: {
    securitySchemes: {
      BearerApiKey: { type: 'http', scheme: 'bearer', bearerFormat: 'Lunidex API key' },
    },
    schemas: {
      DataEnvelope: {
        type: 'object', required: ['data'], properties: {
          data: {}, meta: { type: 'object', additionalProperties: true },
        },
      },
      ErrorEnvelope: {
        type: 'object', required: ['error'], properties: {
          error: { type: 'object', required: ['code', 'message'], properties: {
            code: { type: 'string' }, message: { type: 'string' }, details: {},
          } },
        },
      },
      CardQuantityWrite: {
        type: 'object', required: ['language', 'variant', 'quantity'], properties: {
          language: { type: 'string', example: 'en' },
          variant: { type: 'string', enum: ['unspecified', 'normal', 'reverse', 'holo'] },
          quantity: { type: 'integer', minimum: 0, maximum: 10000, description: 'Zero removes this variant possession.' },
        },
      },
      CardHolding: {
        type: 'object', required: ['cardId', 'setId', 'language', 'variant', 'quantity'], properties: {
          cardId: { type: 'string' }, collectionKey: { type: 'string' }, setId: { type: ['string', 'null'] },
          language: { type: ['string', 'null'] }, variant: { type: 'string' }, quantity: { type: 'integer', minimum: 0 },
          legacy: { type: 'boolean' },
        },
      },
      SealedPosition: {
        type: 'object', required: ['product', 'language', 'quantity', 'costCents', 'valueCents', 'missingPrice'], properties: {
          product: { type: 'object', additionalProperties: true }, language: { type: 'string' }, quantity: { type: 'integer' },
          costCents: { type: 'integer' }, valueCents: { type: ['integer', 'null'] }, missingPrice: { type: 'boolean' },
        },
      },
      SealedTransactionWrite: {
        type: 'object', required: ['expectedRevision', 'kind', 'cardmarketProductId', 'date', 'quantity'], properties: {
          expectedRevision: { type: 'integer', minimum: 0 },
          revision: { type: 'integer', minimum: 1, description: 'Required on PATCH.' },
          kind: { type: 'string', enum: ['buy', 'sell', 'exchange'] },
          cardmarketProductId: { type: 'integer', minimum: 1 },
          language: { type: 'string', enum: ['unknown', 'en', 'fr', 'es', 'de', 'it', 'ja'] },
          date: { type: 'string', format: 'date' }, quantity: { type: 'integer', minimum: 1 },
          unitPriceCents: { type: 'integer', minimum: 0 }, feesCents: { type: 'integer', minimum: 0 },
          shippingCents: { type: 'integer', minimum: 0 }, discountCents: { type: 'integer', minimum: 0 },
          paymentFeesCents: { type: 'integer', minimum: 0 }, otherCostsCents: { type: 'integer', minimum: 0 },
          exchangeGive: { type: 'object', properties: {
            cardmarketProductId: { type: 'integer', minimum: 1 }, language: { type: 'string' }, quantity: { type: 'integer', minimum: 1 },
          } },
          allocationMethod: { type: 'string', enum: ['fifo', 'manual'] },
        },
      },
      VoidTransactionWrite: {
        type: 'object', required: ['revision', 'expectedRevision'], properties: {
          revision: { type: 'integer', minimum: 1 }, expectedRevision: { type: 'integer', minimum: 0 },
        },
      },
    },
  },
};

function getOpenApi(): NextResponse {
  return NextResponse.json(specification, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}

export const GET = withObservedRouteHandler('/api/v1/openapi.json', 'api', getOpenApi);
