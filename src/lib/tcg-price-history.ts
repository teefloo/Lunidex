import { isTCGCardLanguage } from '@/lib/tcg-language';
import type { TCGPriceVariant } from '@/lib/tcg-qualified-price-history';

export type PriceHistoryStatus = 'empty' | 'unavailable' | 'unqualified-history' | 'insufficient-data' | 'ready';

export interface QualifiedPriceHistoryEntry {
  id: number;
  card_id: string;
  set_id: string;
  cardmarket_product_id: number;
  card_language: string;
  variant: TCGPriceVariant;
  source: 'tcgdex-cardmarket';
  metric: 'trend';
  currency: 'EUR';
  value: number;
  source_observed_at: string;
  collected_at: string;
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isQualifiedEntry(value: unknown): value is QualifiedPriceHistoryEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<QualifiedPriceHistoryEntry>;
  return Number.isSafeInteger(entry.id)
    && typeof entry.card_id === 'string' && entry.card_id.length > 0
    && typeof entry.set_id === 'string' && entry.set_id.length > 0
    && Number.isSafeInteger(entry.cardmarket_product_id) && (entry.cardmarket_product_id ?? 0) > 0
    && isTCGCardLanguage(entry.card_language)
    && (entry.variant === 'normal' || entry.variant === 'holo' || entry.variant === 'reverse')
    && entry.source === 'tcgdex-cardmarket'
    && entry.metric === 'trend'
    && entry.currency === 'EUR'
    && typeof entry.value === 'number' && Number.isFinite(entry.value) && entry.value > 0
    && isDate(entry.source_observed_at)
    && isDate(entry.collected_at);
}

/**
 * Validates history at the browser boundary too. Legacy rows remain hidden;
 * only explicitly qualified Cardmarket EUR trend points can reach the chart.
 */
export function getSafePriceHistoryResponse(payload: unknown): { history: QualifiedPriceHistoryEntry[]; status: PriceHistoryStatus } {
  const candidate = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as { history?: unknown; status?: unknown }
    : {};
  if (candidate.status === 'empty' || candidate.status === 'unavailable' || candidate.status === 'unqualified-history') {
    return { history: [], status: candidate.status };
  }
  if (!Array.isArray(candidate.history) || !candidate.history.every(isQualifiedEntry)) {
    return { history: [], status: 'unqualified-history' };
  }
  const firstPoint = candidate.history[0];
  if (firstPoint && candidate.history.some((point) => (
    point.cardmarket_product_id !== firstPoint.cardmarket_product_id || point.set_id !== firstPoint.set_id
  ))) {
    return { history: [], status: 'unqualified-history' };
  }
  if (candidate.status === 'ready' && candidate.history.length >= 2) {
    return { history: candidate.history, status: 'ready' };
  }
  if (candidate.status === 'insufficient-data' && candidate.history.length > 0 && candidate.history.length < 2) {
    return { history: candidate.history, status: 'insufficient-data' };
  }
  return { history: [], status: 'unqualified-history' };
}
