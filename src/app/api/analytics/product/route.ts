import { NextRequest, NextResponse } from 'next/server';
import { getProductMetricsClient, isProductMetricsConfigured } from '@/lib/supabase/product-metrics-server';
import { rateLimit } from '@/lib/rate-limit';
import { createHash } from 'crypto';

const allowed = {
  tcg_start_opened: [['home_cta', 'catalog', 'direct', 'seo']], tcg_set_search_used: [['length_1_3', 'length_4_8', 'length_9_plus']],
  tcg_set_selected: [['search', 'latest_list']], tcg_album_opened: [['activation', 'collection']],
  tcg_first_value_reached: [], tcg_activation_completed: [['second_owned_card', 'wishlist']],
  tcg_sync_prompt_shown: [], tcg_sync_prompt_actioned: [['create_account', 'continue_local', 'dismiss']],
  tcg_returned_after_activation: [['day_0_7', 'day_8_30', 'day_31_90', 'day_91_plus'], ['owned_add', 'owned_remove', 'album_open', 'wishlist_open']],
  tcg_activation_error: [['start_load', 'set_load', 'album_load', 'collection_mutation', 'progress_render', 'wishlist_mutation'], ['network', 'upstream_5xx', 'client_validation', 'unknown']],
} as const;
type EventName = keyof typeof allowed;

function forbidden(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const site = request.headers.get('sec-fetch-site');
  if (!origin || !host || (site !== 'same-origin' && site !== 'same-site')) return true;
  try { return new URL(origin).host !== host; } catch { return true; }
}

function ephemeralClientKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim() ?? 'unknown';
  return `product-metrics:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('content-type') !== 'application/json' || forbidden(request)) return new NextResponse(null, { status: 403, headers });
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 512) return new NextResponse(null, { status: 413, headers });
  if (!rateLimit(ephemeralClientKey(request), 30)) return new NextResponse(null, { status: 429, headers });
  const raw = await request.text().catch(() => '');
  if (new TextEncoder().encode(raw).byteLength > 512) return new NextResponse(null, { status: 413, headers });
  const payload = (() => { try { return JSON.parse(raw) as { event?: unknown; propertyA?: unknown; propertyB?: unknown }; } catch { return null; } })();
  if (!payload || typeof payload.event !== 'string' || !(payload.event in allowed) || Object.keys(payload).some((key) => key !== 'event' && key !== 'propertyA' && key !== 'propertyB')) return new NextResponse(null, { status: 400, headers });
  const event = payload.event as EventName;
  const values = [payload.propertyA, payload.propertyB];
  const expectedArity = allowed[event].length;
  if (values.slice(0, expectedArity).some((value) => typeof value !== 'string') || values.slice(expectedArity).some((value) => value !== undefined)) return new NextResponse(null, { status: 400, headers });
  if (values.some((value) => value !== undefined && (typeof value !== 'string' || value.length === 0 || value.length > 32))) return new NextResponse(null, { status: 400, headers });
  if (values.some((value, index) => value !== undefined && !allowed[event][index]?.includes(value as never))) return new NextResponse(null, { status: 400, headers });
  if (!isProductMetricsConfigured) return new NextResponse(null, { status: 503, headers });
  const client = getProductMetricsClient();
  const { error } = await client!.schema('analytics').rpc('increment_daily_metric', { p_event_name: event, p_property_a: payload.propertyA ?? '', p_property_b: payload.propertyB ?? '' });
  return error ? new NextResponse(null, { status: 503, headers }) : new NextResponse(null, { status: 204, headers });
}
