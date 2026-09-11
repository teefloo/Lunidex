import { fetchAppApi } from '@/lib/app-api';
import type {
  SealedCashflowRow,
  SealedLedgerResult,
  SealedPortfolioPoint,
  SealedPortfolioSummary,
  SealedPortfolioTotals,
  SealedPriceSnapshot,
  SealedProduct,
  SealedSourceStatus,
  SealedTransaction,
  SealedTransactionDraft,
} from '@primedex/core';

export interface SealedSyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'failed';
  details: Record<string, unknown>;
}

export interface SealedOverviewResponse {
  revision: number;
  priceRevision: number;
  totals: SealedPortfolioTotals;
  positions: SealedPortfolioSummary['positions'];
  lots: SealedLedgerResult['lots'];
  sales: SealedLedgerResult['sales'];
  history: SealedPortfolioPoint[];
  recent: Array<{ days: number; day: string; valueCents: number | null; deltaCents: number | null }>;
  cashflow: SealedCashflowRow[];
  period: {
    from: string;
    to: string;
    buysCents: number;
    netSalesCents: number;
    realizedCents: number;
    cashFlowCents: number;
    endStockCostCents: number;
    valueChangeCents: number | null;
  };
  sync: SealedSyncRun[];
  lastSync: Record<string, unknown> | null;
}

export interface SealedCatalogueResponse {
  products: SealedProduct[];
  prices: SealedPriceSnapshot[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SealedProductDetailResponse extends SealedPortfolioSummary {
  product: SealedProduct;
  transactions: SealedTransaction[];
  prices: SealedPriceSnapshot[];
  valuation: SealedPortfolioSummary['positions'][number]['valuation'];
  observed: {
    metric: 'trend';
    high: number | null;
    low: number | null;
    drawdown: number | null;
    firstPurchase: { metric: 'trend'; percent: number; from: string; to: string } | null;
    lastPurchase: { metric: 'trend'; percent: number; from: string; to: string } | null;
  };
}

export interface SealedSourcesResponse extends SealedSourceStatus {
  sources: { catalogue: string; prices: string };
  sync: SealedSyncRun[];
  lastSync: Record<string, unknown> | null;
}

export class SealedApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SealedApiError';
    this.status = status;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchAppApi(path, init, { feature: 'tcg-sealed' });
  const payload = await response.json().catch(() => null) as { error?: unknown } | T | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Sealed portfolio request failed.';
    throw new SealedApiError(message, response.status);
  }
  return payload as T;
}

function jsonInit(method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  };
}

export function fetchSealedOverview(
  options: { from?: string; to?: string; group?: 'day' | 'month' | 'year'; signal?: AbortSignal } = {},
): Promise<SealedOverviewResponse> {
  const params = new URLSearchParams();
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.group) params.set('group', options.group);
  return requestJson(`/api/tcg/sealed/overview${params.size ? `?${params.toString()}` : ''}`, {
    cache: 'no-store',
    signal: options.signal,
  });
}

export function fetchSealedCatalogue(
  query = '',
  page = 0,
  signal?: AbortSignal,
): Promise<SealedCatalogueResponse> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return requestJson(`/api/tcg/sealed/catalogue?${params.toString()}`, { cache: 'no-store', signal });
}

export function fetchSealedProduct(id: number, signal?: AbortSignal): Promise<SealedProductDetailResponse> {
  return requestJson(`/api/tcg/sealed/products/${id}`, { cache: 'no-store', signal });
}

export function fetchSealedTransactions(includeVoided = true, signal?: AbortSignal): Promise<{ revision: number; transactions: SealedTransaction[] }> {
  return requestJson(`/api/tcg/sealed/transactions?includeVoided=${includeVoided ? 'true' : 'false'}`, { cache: 'no-store', signal });
}

export function createSealedTransaction(
  draft: SealedTransactionDraft,
  expectedRevision?: number,
): Promise<{ transaction: SealedTransaction; revision: number }> {
  return requestJson('/api/tcg/sealed/transactions', jsonInit('POST', { ...draft, ...(expectedRevision === undefined ? {} : { expectedRevision }) }));
}

export function updateSealedTransaction(
  transaction: SealedTransaction,
  expectedRevision?: number,
): Promise<{ transaction: SealedTransaction; revision: number }> {
  const { id, revision } = transaction;
  const draft: SealedTransactionDraft = {
    kind: transaction.kind,
    cardmarketProductId: transaction.cardmarketProductId,
    language: transaction.language,
    date: transaction.date,
    quantity: transaction.quantity,
    unitPriceCents: transaction.unitPriceCents,
    feesCents: transaction.feesCents,
    shippingCents: transaction.shippingCents,
    discountCents: transaction.discountCents,
    paymentFeesCents: transaction.paymentFeesCents,
    otherCostsCents: transaction.otherCostsCents,
    platform: transaction.platform,
    counterparty: transaction.counterparty,
    notes: transaction.notes,
    storage: transaction.storage,
    allocationMethod: transaction.allocationMethod,
    selections: transaction.selections,
  };
  return requestJson(`/api/tcg/sealed/transactions/${id}`, jsonInit('PATCH', { ...draft, revision, ...(expectedRevision === undefined ? {} : { expectedRevision }) }));
}

export function voidSealedTransaction(
  transaction: SealedTransaction,
  expectedRevision?: number,
): Promise<{ transaction: SealedTransaction; revision: number }> {
  return requestJson(`/api/tcg/sealed/transactions/${transaction.id}/void`, jsonInit('POST', { revision: transaction.revision, ...(expectedRevision === undefined ? {} : { expectedRevision }) }));
}

export function fetchSealedSources(signal?: AbortSignal): Promise<SealedSourcesResponse> {
  return requestJson('/api/tcg/sealed/sources', { cache: 'no-store', signal });
}

export function syncSealedSources(): Promise<{ sync: Record<string, unknown> }> {
  return requestJson('/api/tcg/sealed/sources', jsonInit('POST', {}));
}

export function fetchSealedAlias(productId: number, signal?: AbortSignal): Promise<{ productId: number; alias: string | null }> {
  return requestJson(`/api/tcg/sealed/aliases/${productId}`, { cache: 'no-store', signal });
}

export function updateSealedAlias(productId: number, alias: string | null): Promise<{ productId: number; alias: string | null }> {
  return requestJson(`/api/tcg/sealed/aliases/${productId}`, jsonInit('PUT', { alias }));
}

export async function downloadSealedExport(format: 'json' | 'csv' = 'json'): Promise<Blob> {
  const response = await fetchAppApi(`/api/tcg/sealed/export?format=${format}`, { cache: 'no-store' }, { feature: 'tcg-sealed', operation: 'export' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: unknown } | null;
    const message = payload && typeof payload.error === 'string' ? payload.error : 'Sealed portfolio export failed.';
    throw new SealedApiError(message, response.status);
  }
  return response.blob();
}
