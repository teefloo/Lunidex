import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { refreshDuePriceHistoryCards, type PriceHistoryRefreshSummary } from '@/lib/tcg-price-history-refresh';
import { reportSentryException } from '@/lib/sentry-observability';

/**
 * Scheduled retention job (see the `crons` entry in vercel.json).
 *
 * Bounds append-only growth that no other code path cleans up:
 * - abandoned daily quiz attempts would otherwise stay `active` forever;
 * - TCG price history snapshots and refresh targets otherwise accumulate.
 * `analytics.daily_metrics` is also purged here so the ingestion path remains
 * a single write on the hot path.
 */

const QUIZ_ATTEMPT_EXPIRY_HOURS = 24;
const PRICE_HISTORY_RETENTION_DAYS = 180;
const DAILY_METRICS_RETENTION_DAYS = 90;

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

interface CountRow {
  count: number | string;
}

function countFrom(rows: CountRow[]): number {
  return Number(rows[0]?.count ?? 0);
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
}

async function getMetricsRetention(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  // No secret configured: the job is disabled rather than open to anyone.
  if (!secret) return NextResponse.json({ error: 'Retention job unavailable' }, { status: 503, headers: NO_STORE_HEADERS });

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) return unauthorized();

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503, headers: NO_STORE_HEADERS });

  try {
    const expiredAttempts = await sql`
      with expired as (
        update public.quiz_attempts
        set status = 'expired'
        where status = 'active'
          and started_at < now() - (${QUIZ_ATTEMPT_EXPIRY_HOURS} * interval '1 hour')
        returning 1
      )
      select count(*)::int as count from expired
    ` as CountRow[];
    const deletedSnapshots = await sql`
      with deleted as (
        delete from public.tcg_price_history
        where recorded_at < now() - (${PRICE_HISTORY_RETENTION_DAYS} * interval '1 day')
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];
    const deletedQualifiedSnapshots = await sql`
      with deleted as (
        delete from public.tcg_price_history_qualified
        where collected_at < now() - (${PRICE_HISTORY_RETENTION_DAYS} * interval '1 day')
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];
    const deletedPriceHistoryRefreshTargets = await sql`
      with deleted as (
        delete from public.tcg_price_history_refresh_targets
        where last_seen_at < now() - (${PRICE_HISTORY_RETENTION_DAYS} * interval '1 day')
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];
    const deletedMetrics = await sql`
      with deleted as (
        delete from analytics.daily_metrics
        where metric_date < current_date - ${DAILY_METRICS_RETENTION_DAYS}
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];
    const deletedApiUsage = await sql`
      with deleted as (
        delete from public.api_usage_daily
        where day < current_date - 89
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];
    const deletedApiBuckets = await sql`
      with deleted as (
        delete from public.api_quota_buckets
        where window_start < now() - interval '2 days'
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];
    const deletedIdempotency = await sql`
      with deleted as (
        delete from public.api_idempotency
        where expires_at < now()
        returning 1
      )
      select count(*)::int as count from deleted
    ` as CountRow[];

    let priceHistoryRefresh: PriceHistoryRefreshSummary = { attempted: 0, captured: 0, failed: 0 };
    let priceHistoryRefreshUnavailable = false;
    try {
      priceHistoryRefresh = await refreshDuePriceHistoryCards(sql);
    } catch (error) {
      priceHistoryRefreshUnavailable = true;
      reportSentryException(error, {
        feature: 'tcg',
        route: '/api/cron/metrics-retention',
        method: 'GET',
        operation: 'price-history-daily-refresh-claim',
        service: 'tcgdex-cardmarket',
      });
    }

    return NextResponse.json(
      {
        ok: true,
        expiredQuizAttempts: countFrom(expiredAttempts),
        deletedPriceHistoryRows: countFrom(deletedSnapshots),
        deletedQualifiedPriceHistoryRows: countFrom(deletedQualifiedSnapshots),
        deletedPriceHistoryRefreshTargets: countFrom(deletedPriceHistoryRefreshTargets),
        priceHistoryRefresh,
        priceHistoryRefreshUnavailable,
        deletedDailyMetricsDays: countFrom(deletedMetrics),
        deletedApiUsageRows: countFrom(deletedApiUsage),
        deletedApiQuotaBuckets: countFrom(deletedApiBuckets),
        deletedApiIdempotencyRows: countFrom(deletedIdempotency),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json({ error: 'Retention job failed' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export const GET = withObservedRouteHandler('/api/cron/metrics-retention', 'sync', getMetricsRetention);
