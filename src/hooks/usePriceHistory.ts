import { useQuery } from '@tanstack/react-query';
import { getSafePriceHistoryResponse, type PriceHistoryStatus, type QualifiedPriceHistoryEntry } from '@/lib/tcg-price-history';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGPriceVariant } from '@/lib/tcg-qualified-price-history';

export type PriceHistoryEntry = QualifiedPriceHistoryEntry;
export interface PriceTrend { eurChange: number | null; }

interface CaptureResponse {
  status: 'captured' | 'already-current' | 'empty' | 'unavailable';
  variants: TCGPriceVariant[];
}

function validCaptureResponse(value: unknown): CaptureResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { status: 'unavailable', variants: [] };
  const response = value as { status?: unknown; variants?: unknown };
  const variants = Array.isArray(response.variants)
    ? response.variants.filter((variant): variant is TCGPriceVariant => variant === 'normal' || variant === 'holo' || variant === 'reverse')
    : [];
  const status = response.status === 'captured' || response.status === 'already-current' || response.status === 'empty'
    ? response.status
    : 'unavailable';
  return { status, variants };
}

async function captureCardmarketPrice(cardId: string, language: TCGCardLanguage): Promise<CaptureResponse> {
  const response = await fetch(`/api/tcg/price-history/${encodeURIComponent(cardId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Failed to capture Cardmarket price for ${cardId}: ${response.status}`);
  return validCaptureResponse(await response.json());
}

async function fetchPriceHistory(
  cardId: string,
  language: TCGCardLanguage,
  variant: TCGPriceVariant,
  days: 7 | 30 | 90,
): Promise<{ history: QualifiedPriceHistoryEntry[]; status: PriceHistoryStatus }> {
  const params = new URLSearchParams({ days: String(days), language, variant });
  const response = await fetch(`/api/tcg/price-history/${encodeURIComponent(cardId)}?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch price history for ${cardId}: ${response.status}`);
  return getSafePriceHistoryResponse(await response.json());
}

/** Capture and register a localized card when its detail view is opened. */
export function usePriceHistoryCapture(
  cardId: string,
  language: TCGCardLanguage,
  enabled = true,
) {
  return useQuery({
    queryKey: ['tcg-price-history-capture', 'tcgdex-cardmarket-v1', cardId, language],
    queryFn: () => captureCardmarketPrice(cardId, language),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
    enabled: Boolean(cardId) && enabled,
  });
}

/** Capture the current quote once per query window, then read one exact series. */
export function usePriceHistory(
  cardId: string,
  language: TCGCardLanguage,
  selectedVariant: TCGPriceVariant,
  days: 7 | 30 | 90 = 30,
) {
  const capture = usePriceHistoryCapture(cardId, language);
  const availableVariants = capture.data?.variants ?? [];
  const variant = availableVariants.includes(selectedVariant) ? selectedVariant : availableVariants[0] ?? selectedVariant;
  const historyQuery = useQuery({
    queryKey: ['tcg-price-history', 'qualified-v3', cardId, language, variant, days],
    queryFn: () => fetchPriceHistory(cardId, language, variant, days),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(cardId) && !capture.isPending && availableVariants.includes(variant),
  });
  const captureStatus: PriceHistoryStatus | undefined = capture.data?.status === 'unavailable'
    ? 'unavailable'
    : capture.data?.status === 'empty' || (capture.data && availableVariants.length === 0)
      ? 'empty'
      : undefined;
  return {
    data: historyQuery.data?.history,
    historyStatus: historyQuery.data?.status ?? captureStatus,
    availableVariants,
    selectedVariant: variant,
    isPending: capture.isPending || (availableVariants.includes(variant) && historyQuery.isPending),
    isError: capture.isError || historyQuery.isError,
  };
}

export function computePriceTrend(history: PriceHistoryEntry[]): PriceTrend {
  if (history.length < 2) return { eurChange: null };
  const sorted = [...history].sort((a, b) => Date.parse(a.source_observed_at) - Date.parse(b.source_observed_at));
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  return { eurChange: oldest.value > 0 ? ((newest.value - oldest.value) / oldest.value) * 100 : null };
}
