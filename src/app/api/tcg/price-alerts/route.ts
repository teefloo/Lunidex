import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, bearerToken } from '@/lib/supabase/server';
import { readJsonBody } from '@/lib/api/route-helpers';

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
  const supabase = getSupabaseServerClient(bearerToken(request.headers.get('Authorization')) ?? undefined);
  if (!supabase) {
    return NextResponse.json({ alerts: [] });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('tcg_price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[price-alerts GET]', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST — create an alert
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient(bearerToken(request.headers.get('Authorization')) ?? undefined);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const { data, error } = await supabase
    .from('tcg_price_alerts')
    .insert({
      user_id: user.id,
      card_id: payload.card_id,
      card_name: payload.card_name,
      alert_type: payload.alert_type,
      threshold_usd: payload.threshold_usd ?? null,
      threshold_eur: payload.threshold_eur ?? null,
      currency,
    })
    .select()
    .single();

  if (error) {
    console.error('[price-alerts POST]', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE — remove an alert by id (?id=uuid)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseServerClient(bearerToken(request.headers.get('Authorization')) ?? undefined);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing alert id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('tcg_price_alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // RLS backup

  if (error) {
    console.error('[price-alerts DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// PATCH — toggle is_active on an alert
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseServerClient(bearerToken(request.headers.get('Authorization')) ?? undefined);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await readJsonBody<{ id?: string; is_active?: boolean }>(request);
  if (!payload?.id || typeof payload.is_active !== 'boolean') {
    return NextResponse.json({ error: 'id and is_active are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tcg_price_alerts')
    .update({ is_active: payload.is_active })
    .eq('id', payload.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[price-alerts PATCH]', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }

  return NextResponse.json({ alert: data });
}
