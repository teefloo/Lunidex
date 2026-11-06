import type { NeonSql } from '@/lib/neon/server';
import { getTCGCardLocalizedCached } from '@/lib/api/server-cache';
import { getQualifiedCardmarketObservations } from '@/lib/tcg-qualified-price-history';
import type { TCGCard } from '@/types/tcg';
import { isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';
import { reportSentryException } from '@/lib/sentry-observability';
import { upsertQualifiedCardmarketObservations } from '@/lib/tcg-price-history-store';

export const DAILY_PRICE_HISTORY_REFRESH_LIMIT = 20;

export interface PriceHistoryRefreshTarget {
  card_id: string;
  card_language: TCGCardLanguage;
}

export interface PriceHistoryRefreshSummary {
  attempted: number;
  captured: number;
  failed: number;
}

interface RefreshDependencies {
  fetchLocalizedCard: (cardId: string, language: TCGCardLanguage) => Promise<TCGCard | null>;
  capture: (card: TCGCard, language: TCGCardLanguage) => Promise<number>;
  reportError: (error: unknown, target: PriceHistoryRefreshTarget) => void;
}

function isRefreshTarget(value: unknown): value is PriceHistoryRefreshTarget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Partial<PriceHistoryRefreshTarget>;
  return typeof row.card_id === 'string'
    && isValidTcgCardId(row.card_id)
    && isTCGCardLanguage(row.card_language);
}

/** Records a card/language that the strict localized price-history endpoint fetched successfully. */
export async function recordPriceHistoryCardSeen(
  sql: NeonSql,
  cardId: string,
  language: TCGCardLanguage,
  seenAt = new Date(),
): Promise<void> {
  const timestamp = seenAt.toISOString();
  await sql`
    insert into public.tcg_price_history_refresh_targets (
      card_id, card_language, last_seen_at, last_checked_at
    ) values (
      ${cardId}, ${language}, ${timestamp}::timestamptz, ${timestamp}::timestamptz
    )
    on conflict (card_id, card_language)
    do update set
      last_seen_at = excluded.last_seen_at,
      last_checked_at = excluded.last_checked_at
  `;
}

/** Claims at most twenty recently viewed targets in one atomic database statement. */
export async function claimDuePriceHistoryRefreshTargets(sql: NeonSql): Promise<PriceHistoryRefreshTarget[]> {
  const rows = await sql`
    with due as (
      select card_id, card_language
      from public.tcg_price_history_refresh_targets
      where last_seen_at >= now() - interval '180 days'
        and (last_checked_at is null or last_checked_at < date_trunc('day', now()))
      order by last_checked_at asc nulls first, last_seen_at desc, card_id, card_language
      limit ${DAILY_PRICE_HISTORY_REFRESH_LIMIT}
      for update skip locked
    )
    update public.tcg_price_history_refresh_targets as target
    set last_checked_at = now()
    from due
    where target.card_id = due.card_id
      and target.card_language = due.card_language
    returning target.card_id, target.card_language
  ` as unknown[];
  return rows.filter(isRefreshTarget).slice(0, DAILY_PRICE_HISTORY_REFRESH_LIMIT);
}

/** Processes independently so one missing locale or failed source does not block the remaining claims. */
export async function refreshTrackedPriceHistoryCards(
  targets: readonly PriceHistoryRefreshTarget[],
  dependencies: RefreshDependencies,
): Promise<PriceHistoryRefreshSummary> {
  const batch = targets.slice(0, DAILY_PRICE_HISTORY_REFRESH_LIMIT);
  const summary: PriceHistoryRefreshSummary = { attempted: batch.length, captured: 0, failed: 0 };

  for (const target of batch) {
    try {
      const card = await dependencies.fetchLocalizedCard(target.card_id, target.card_language);
      if (!card || card.id !== target.card_id) {
        throw new Error(`Localized TCG card identity mismatch for ${target.card_id}`);
      }
      summary.captured += await dependencies.capture(card, target.card_language);
    } catch (error) {
      summary.failed += 1;
      try {
        dependencies.reportError(error, target);
      } catch {
        // Observability must never stop a batch or the shared retention job.
      }
    }
  }

  return summary;
}

/** Runs one bounded refresh pass using the existing strict localized TCGdex cache. */
export async function refreshDuePriceHistoryCards(sql: NeonSql): Promise<PriceHistoryRefreshSummary> {
  const targets = await claimDuePriceHistoryRefreshTargets(sql);
  return refreshTrackedPriceHistoryCards(targets, {
    fetchLocalizedCard: getTCGCardLocalizedCached,
    capture: async (card, language) => upsertQualifiedCardmarketObservations(
      sql,
      getQualifiedCardmarketObservations(card, language),
    ),
    reportError: (error, target) => {
      const detail = error instanceof Error ? error.message : 'Unknown refresh error';
      reportSentryException(new Error(`Card ${target.card_id} (${target.card_language}) refresh failed: ${detail}`), {
        feature: 'tcg',
        route: '/api/cron/metrics-retention',
        method: 'GET',
        operation: 'price-history-daily-refresh-card',
        service: 'tcgdex-cardmarket',
      });
    },
  });
}
