export type ApiGuideParameter = {
  name: string;
  location: 'path' | 'query' | 'header';
  required?: true;
};

export const API_GUIDE_OPERATIONS = [
  { group: 'account', method: 'GET', path: '/openapi.json', translationKey: 'openapi' },
  { group: 'account', method: 'GET', path: '/me', translationKey: 'me' },
  { group: 'account', method: 'GET', path: '/summary', translationKey: 'summary' },
  {
    group: 'cards', method: 'GET', path: '/cards', translationKey: 'cards_list',
    parameters: [
      { name: 'cursor', location: 'query' },
      { name: 'limit', location: 'query' },
      { name: 'language', location: 'query' },
      { name: 'set', location: 'query' },
    ],
  },
  {
    group: 'cards', method: 'GET', path: '/cards/{cardId}', translationKey: 'card_detail',
    parameters: [
      { name: 'cardId', location: 'path', required: true },
      { name: 'language', location: 'query' },
    ],
  },
  {
    group: 'cards', method: 'PUT', path: '/cards/{cardId}', translationKey: 'card_write',
    parameters: [{ name: 'cardId', location: 'path', required: true }],
  },
  {
    group: 'sealed', method: 'GET', path: '/sealed/catalogue', translationKey: 'sealed_catalogue',
    parameters: [
      { name: 'q', location: 'query' },
      { name: 'cursor', location: 'query' },
    ],
  },
  {
    group: 'sealed', method: 'GET', path: '/sealed/positions', translationKey: 'sealed_positions',
    parameters: [
      { name: 'cursor', location: 'query' },
      { name: 'limit', location: 'query' },
      { name: 'language', location: 'query' },
      { name: 'productId', location: 'query' },
    ],
  },
  {
    group: 'sealed', method: 'GET', path: '/sealed/positions/{productId}', translationKey: 'sealed_position',
    parameters: [{ name: 'productId', location: 'path', required: true }],
  },
  {
    group: 'sealed', method: 'GET', path: '/sealed/transactions', translationKey: 'sealed_transactions_list',
    parameters: [
      { name: 'cursor', location: 'query' },
      { name: 'limit', location: 'query' },
      { name: 'language', location: 'query' },
      { name: 'productId', location: 'query' },
      { name: 'type', location: 'query' },
      { name: 'includeVoided', location: 'query' },
      { name: 'voided', location: 'query' },
    ],
  },
  {
    group: 'sealed', method: 'POST', path: '/sealed/transactions', translationKey: 'sealed_transaction_create',
    parameters: [{ name: 'Idempotency-Key', location: 'header', required: true }],
  },
  {
    group: 'sealed', method: 'GET', path: '/sealed/transactions/{id}', translationKey: 'sealed_transaction_detail',
    parameters: [{ name: 'id', location: 'path', required: true }],
  },
  {
    group: 'sealed', method: 'PATCH', path: '/sealed/transactions/{id}', translationKey: 'sealed_transaction_update',
    parameters: [{ name: 'id', location: 'path', required: true }],
  },
  {
    group: 'sealed', method: 'POST', path: '/sealed/transactions/{id}/void', translationKey: 'sealed_transaction_void',
    parameters: [{ name: 'id', location: 'path', required: true }],
  },
] as const;

export const API_GUIDE_QUOTAS = {
  readsPerMinute: 60,
  writesPerMinute: 10,
  readsPerDay: 1_000,
  writesPerDay: 100,
  cardDetailsPerDay: 100,
  sealedCalculationsPerDay: 100,
  cardDetailsGlobalPerDay: 5_000,
  sealedCalculationsGlobalPerDay: 5_000,
} as const;
