import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/route-helpers';
import { getNeonClient } from '@/lib/neon/server';
import { rateLimit } from '@/lib/rate-limit';
import { createHash } from 'crypto';
import { normalizeCampaignSlug } from '@/lib/campaigns';

const allowed = {
  tcg_start_opened: [['home_cta', 'catalog', 'direct', 'seo', 'campaign']], tcg_set_search_used: [['length_1_3', 'length_4_8', 'length_9_plus']],
  tcg_set_selected: [['search', 'latest_list']], tcg_album_opened: [['activation', 'collection']],
  tcg_first_value_reached: [], tcg_activation_completed: [['second_owned_card', 'wishlist']],
  tcg_sync_prompt_shown: [], tcg_sync_prompt_actioned: [['create_account', 'continue_local', 'dismiss']],
  tcg_returned_after_activation: [['day_0_7', 'day_8_30', 'day_31_90', 'day_91_plus'], ['owned_add', 'owned_remove', 'album_open', 'wishlist_open']],
  tcg_activation_error: [['start_load', 'set_load', 'album_load', 'collection_mutation', 'progress_render', 'wishlist_mutation'], ['network', 'upstream_5xx', 'client_validation', 'unknown']],
} as const;
type EventName = keyof typeof allowed;
type ProductPayload = {
  event?: unknown;
  propertyA?: unknown;
  propertyB?: unknown;
};

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
  const payload = await readJsonBody<ProductPayload>(request, { maxBytes: 512 });
  if (!payload || typeof payload.event !== 'string' || !(payload.event in allowed) || Object.keys(payload).some((key) => key !== 'event' && key !== 'propertyA' && key !== 'propertyB')) return new NextResponse(null, { status: 400, headers });
  const event = payload.event as EventName;
  const values = [payload.propertyA, payload.propertyB];
  const isCampaignStart = event === 'tcg_start_opened' && payload.propertyA === 'campaign';
  const expectedArity = isCampaignStart ? 2 : allowed[event].length;
  if (values.slice(0, expectedArity).some((value) => typeof value !== 'string') || values.slice(expectedArity).some((value) => value !== undefined)) return new NextResponse(null, { status: 400, headers });
  if (values.some((value) => value !== undefined && (typeof value !== 'string' || value.length === 0 || value.length > 32))) return new NextResponse(null, { status: 400, headers });
  if (isCampaignStart) {
    const campaign = normalizeCampaignSlug(typeof payload.propertyB === 'string' ? payload.propertyB : null);
    if (!campaign || campaign !== payload.propertyB) return new NextResponse(null, { status: 400, headers });
  } else if (values.some((value, index) => value !== undefined && !allowed[event][index]?.includes(value as never))) {
    return new NextResponse(null, { status: 400, headers });
  }
  const sql = getNeonClient();
  if (!sql) return new NextResponse(null, { status: 503, headers });
  try {
    await sql`
      delete from analytics.daily_metrics
      where metric_date < current_date - 90
    `;
    await sql`
      select analytics.increment_daily_metric(
        ${event}, ${payload.propertyA ?? ''}, ${payload.propertyB ?? ''}
      )
    `;
    return new NextResponse(null, { status: 204, headers });
  } catch {
    return new NextResponse(null, { status: 503, headers });
  }
}
