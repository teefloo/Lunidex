export const API_GUIDE_OPERATIONS = [
  { group: 'account', method: 'GET', path: '/openapi.json', translationKey: 'openapi' },
  { group: 'account', method: 'GET', path: '/me', translationKey: 'me' },
  { group: 'account', method: 'GET', path: '/summary', translationKey: 'summary' },
  { group: 'cards', method: 'GET', path: '/cards', translationKey: 'cards_list' },
  { group: 'cards', method: 'GET', path: '/cards/{cardId}', translationKey: 'card_detail' },
  { group: 'cards', method: 'PUT', path: '/cards/{cardId}', translationKey: 'card_write' },
  { group: 'sealed', method: 'GET', path: '/sealed/catalogue', translationKey: 'sealed_catalogue' },
  { group: 'sealed', method: 'GET', path: '/sealed/positions', translationKey: 'sealed_positions' },
  { group: 'sealed', method: 'GET', path: '/sealed/positions/{productId}', translationKey: 'sealed_position' },
  { group: 'sealed', method: 'GET', path: '/sealed/transactions', translationKey: 'sealed_transactions_list' },
  { group: 'sealed', method: 'POST', path: '/sealed/transactions', translationKey: 'sealed_transaction_create' },
  { group: 'sealed', method: 'GET', path: '/sealed/transactions/{id}', translationKey: 'sealed_transaction_detail' },
  { group: 'sealed', method: 'PATCH', path: '/sealed/transactions/{id}', translationKey: 'sealed_transaction_update' },
  { group: 'sealed', method: 'POST', path: '/sealed/transactions/{id}/void', translationKey: 'sealed_transaction_void' },
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
