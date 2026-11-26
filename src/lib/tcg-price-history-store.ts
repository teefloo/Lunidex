import type { NeonSql } from '@/lib/neon/server';
import type { QualifiedCardmarketObservation } from '@/lib/tcg-qualified-price-history';

/** Idempotently stores only observations with exact source, product, set, and finish identity. */
export async function upsertQualifiedCardmarketObservations(
  sql: NeonSql,
  observations: readonly QualifiedCardmarketObservation[],
): Promise<number> {
  let captured = 0;
  for (const point of observations) {
    const inserted = await sql`
      insert into public.tcg_price_history_qualified (
        card_id, set_id, card_language, cardmarket_product_id, variant,
        market_language_scope, condition_scope, source, metric, currency,
        value, source_observed_at, collected_at
      ) values (
        ${point.cardId}, ${point.setId}, ${point.cardLanguage}, ${point.cardmarketProductId}, ${point.variant},
        'aggregate', 'aggregate', ${point.source}, ${point.metric}, ${point.currency},
        ${point.value}, ${point.sourceObservedAt}::timestamptz, now()
      )
      on conflict (card_id, card_language, cardmarket_product_id, set_id, variant, source, metric, currency, source_day)
      do update set
        value = excluded.value,
        source_observed_at = excluded.source_observed_at,
        collected_at = now()
      where excluded.source_observed_at > public.tcg_price_history_qualified.source_observed_at
      returning id
    ` as Array<{ id: number }>;
    if (inserted.length > 0) captured += 1;
  }
  return captured;
}
