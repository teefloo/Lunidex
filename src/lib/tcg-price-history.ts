export type PriceHistoryStatus = 'empty' | 'unavailable' | 'unqualified-history';

/** Legacy history has no reliable language/finish identity and must not be plotted. */
export function getSafePriceHistoryResponse(payload: unknown): { history: []; status: PriceHistoryStatus } {
  const status = payload && typeof payload === 'object' && 'status' in payload
    ? payload.status
    : undefined;
  return {
    history: [],
    status: status === 'empty' || status === 'unavailable' ? status : 'unqualified-history',
  };
}
