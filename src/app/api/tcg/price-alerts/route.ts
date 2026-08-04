import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';

// Price polling is intentionally paused for the public launch. The scheduled
// sender does not yet use standards-compliant web-push payload encryption.
const PRICE_ALERTS_ENABLED = false;

function unavailableResponse() {
  return NextResponse.json(
    { error: 'Price alerts are temporarily unavailable' },
    { status: 410 },
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateAlertPayload {
  card_id?: string;
  card_name?: string;
  alert_type?: string;
  threshold_usd?: number;
  threshold_eur?: number;
  currency?: string;
}

type NumericValue = number | string | null;

interface PriceAlertRow {
  id: string;
  card_id: string;
  card_name: string;
  alert_type: 'below' | 'above';
  threshold_usd: NumericValue;
  threshold_eur: NumericValue;
  currency: 'USD' | 'EUR';
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

function toPriceAlert(row: PriceAlertRow) {
  return {
    ...row,
    threshold_usd: row.threshold_usd === null ? null : Number(row.threshold_usd),
    threshold_eur: row.threshold_eur === null ? null : Number(row.threshold_eur),
  };
}

function isValidAlertType(v: unknown): v is 'below' | 'above' {
  return v === 'below' || v === 'above';
}

function isValidCurrency(v: unknown): v is 'USD' | 'EUR' {
  return v === 'USD' || v === 'EUR';
}

// ---------------------------------------------------------------------------
// GET — list user's alerts
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!PRICE_ALERTS_ENABLED) return unavailableResponse();
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await ensureNeonUser(sql, user);

  const rows = await sql`
    select id, card_id, card_name, alert_type, threshold_usd, threshold_eur,
      currency, is_active, last_triggered_at, created_at
    from public.tcg_price_alerts
    where user_id = ${user.id}::uuid
    order by created_at desc
  ` as PriceAlertRow[];

  return NextResponse.json({ alerts: rows.map(toPriceAlert) });
}

// ---------------------------------------------------------------------------
// POST — create an alert
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!PRICE_ALERTS_ENABLED) return unavailableResponse();
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await ensureNeonUser(sql, user);

  const payload = await readJsonBody<CreateAlertPayload>(request);

  if (
    typeof payload?.card_id !== 'string' ||
    typeof payload.card_name !== 'string' ||
    !payload.card_id ||
    !payload.card_name ||
    payload.card_id.length > 128 ||
    payload.card_name.length > 256
  ) {
    return NextResponse.json({ error: 'card_id and card_name are required' }, { status: 400 });
  }
  if (!isValidAlertType(payload.alert_type)) {
    return NextResponse.json({ error: 'alert_type must be "below" or "above"' }, { status: 400 });
  }
  const currency = isValidCurrency(payload.currency) ? payload.currency : 'USD';
  const hasTcg = typeof payload.threshold_usd === 'number' && Number.isFinite(payload.threshold_usd) && payload.threshold_usd > 0;
  const hasCm = typeof payload.threshold_eur === 'number' && Number.isFinite(payload.threshold_eur) && payload.threshold_eur > 0;
  if (!hasTcg && !hasCm) {
    return NextResponse.json({ error: 'At least one threshold is required' }, { status: 400 });
  }

  const rows = await sql`
    insert into public.tcg_price_alerts (
      user_id, card_id, card_name, alert_type,
      threshold_usd, threshold_eur, currency
    )
    values (
      ${user.id}::uuid, ${payload.card_id}, ${payload.card_name}, ${payload.alert_type},
      ${payload.threshold_usd ?? null}, ${payload.threshold_eur ?? null}, ${currency}
    )
    returning id, card_id, card_name, alert_type, threshold_usd, threshold_eur,
      currency, is_active, last_triggered_at, created_at
  ` as PriceAlertRow[];
  const data = rows[0];
  if (!data) return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });

  return NextResponse.json({ alert: toPriceAlert(data) }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE — remove an alert by id (?id=uuid)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  if (!PRICE_ALERTS_ENABLED) return unavailableResponse();
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await ensureNeonUser(sql, user);

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing alert id' }, { status: 400 });
  }

  await sql`
    delete from public.tcg_price_alerts
    where id = ${id}::uuid and user_id = ${user.id}::uuid
  `;

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PATCH — toggle is_active on an alert
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  if (!PRICE_ALERTS_ENABLED) return unavailableResponse();
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await ensureNeonUser(sql, user);

  const payload = await readJsonBody<{ id?: string; is_active?: boolean }>(request);
  if (!payload?.id || typeof payload.is_active !== 'boolean') {
    return NextResponse.json({ error: 'id and is_active are required' }, { status: 400 });
  }

  const rows = await sql`
    update public.tcg_price_alerts
    set is_active = ${payload.is_active}
    where id = ${payload.id}::uuid and user_id = ${user.id}::uuid
    returning id, card_id, card_name, alert_type, threshold_usd, threshold_eur,
      currency, is_active, last_triggered_at, created_at
  ` as PriceAlertRow[];
  const data = rows[0];
  if (!data) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

  return NextResponse.json({ alert: toPriceAlert(data) });
}
