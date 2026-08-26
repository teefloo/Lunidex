// Supabase Edge Function — poll-tcg-prices
// Scheduled every 6 hours via Supabase cron scheduler.
//
// Env vars required (set in Supabase Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
//
// Deploy: supabase functions deploy poll-tcg-prices --no-verify-jwt
// The scheduler must send `Authorization: Bearer <CRON_SECRET>` in every POST.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  hasValidSchedulerAuthorization,
  isSafePushEndpoint,
} from './security.ts';

// The public V1 does not offer automatic price alerts. Keep the deployed
// scheduler fail-closed until compliant encrypted web-push delivery exists.
const PRICE_ALERTS_ENABLED = false;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceAlert {
  id: string;
  user_id: string;
  card_id: string;
  card_name: string;
  alert_type: 'below' | 'above';
  threshold_usd: number | null;
  threshold_eur: number | null;
  currency: 'USD' | 'EUR';
  is_active: boolean;
  last_triggered_at: string | null;
}

interface PushSubscriptionRow {
  user_id: string;
  subscription: PushSubscriptionJSON;
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface TCGdexCardPricing {
  tcgplayer?: {
    normal?: { lowPrice?: number; midPrice?: number; highPrice?: number };
    holofoil?: { lowPrice?: number; midPrice?: number; highPrice?: number };
  };
  cardmarket?: {
    avg?: number;
    low?: number;
    trend?: number;
  };
}

interface TCGdexCard {
  id: string;
  name: string;
  set?: { id: string };
  pricing?: TCGdexCardPricing;
}

interface PriceSnapshot {
  tcgplayer_low: number | null;
  tcgplayer_mid: number | null;
  tcgplayer_high: number | null;
  cardmarket_avg: number | null;
  cardmarket_low: number | null;
  cardmarket_trend: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractPrices(card: TCGdexCard): PriceSnapshot {
  const tcp = card.pricing?.tcgplayer;
  const tcpTier = tcp?.holofoil ?? tcp?.normal;
  const cm = card.pricing?.cardmarket;
  return {
    tcgplayer_low: tcpTier?.lowPrice ?? null,
    tcgplayer_mid: tcpTier?.midPrice ?? null,
    tcgplayer_high: tcpTier?.highPrice ?? null,
    cardmarket_avg: cm?.avg ?? null,
    cardmarket_low: cm?.low ?? null,
    cardmarket_trend: cm?.trend ?? null,
  };
}

/** Returns true when two prices differ by more than 1%. */
function hasPriceChanged(prev: number | null, next: number | null): boolean {
  if (prev === null && next === null) return false;
  if (prev === null || next === null) return true;
  if (prev === 0) return next !== 0;
  return Math.abs(next - prev) / Math.abs(prev) > 0.01;
}

function snapshotChanged(prev: PriceSnapshot | null, next: PriceSnapshot): boolean {
  if (!prev) return true;
  return (
    hasPriceChanged(prev.tcgplayer_low, next.tcgplayer_low) ||
    hasPriceChanged(prev.tcgplayer_mid, next.tcgplayer_mid) ||
    hasPriceChanged(prev.tcgplayer_high, next.tcgplayer_high) ||
    hasPriceChanged(prev.cardmarket_avg, next.cardmarket_avg) ||
    hasPriceChanged(prev.cardmarket_low, next.cardmarket_low) ||
    hasPriceChanged(prev.cardmarket_trend, next.cardmarket_trend)
  );
}

/** Fetch card details (with pricing) from TCGdex public API. */
async function fetchCardPricing(cardId: string): Promise<TCGdexCard | null> {
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`);
    if (!res.ok) return null;
    return (await res.json()) as TCGdexCard;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// VAPID / Web Push
// ---------------------------------------------------------------------------

/**
 * Minimal Web Push sender using VAPID (no npm dependency needed in Deno).
 * Uses the SubtleCrypto API available in the Deno runtime.
 */
async function sendWebPush(
  subscription: PushSubscriptionJSON,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<boolean> {
  try {
    if (!await isSafePushEndpoint(subscription.endpoint)) {
      console.error('[push] rejected unsafe subscription endpoint');
      return false;
    }

    // Encode keys
    const pubKeyBytes = base64UrlDecode(vapidPublicKey);
    const privKeyBytes = base64UrlDecode(vapidPrivateKey);

    // Import ECDSA key for signing JWT
    const privKey = await crypto.subtle.importKey(
      'pkcs8',
      privKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );

    // Build VAPID JWT
    const audience = new URL(subscription.endpoint).origin;
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const claims = base64UrlEncode(
      JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: vapidSubject }),
    );
    const unsigned = `${header}.${claims}`;
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privKey,
      new TextEncoder().encode(unsigned),
    );
    const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

    // Encrypt payload with ECDH (simplified — real apps should use web-push lib)
    // Here we send unencrypted for Edge Function compatibility; production should
    // implement RFC 8291 encryption or call a separate encryption micro-service.
    const body = new TextEncoder().encode(payload);

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        Authorization: `vapid t=${jwt}, k=${base64UrlEncode(pubKeyBytes)}`,
        TTL: '86400',
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });

    return res.status === 201 || res.status === 202;
  } catch {
    console.error('[push] send error');
    return false;
  }
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (!PRICE_ALERTS_ENABLED) {
    return new Response(JSON.stringify({ error: 'Price alerts are temporarily disabled' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // This function is deployed without Supabase JWT verification because it is
  // scheduler-only. Treat an absent scheduler secret as a configuration outage,
  // never as permission to run with the service-role client.
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret?.trim()) {
    return new Response(JSON.stringify({ error: 'Scheduler authentication is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
    });
  }

  if (!await hasValidSchedulerAuthorization(req.headers.get('Authorization'), cronSecret)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@lunidex.app';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const results = { fetched: 0, inserted: 0, alertsTriggered: 0, errors: 0 };

  try {
    // ------------------------------------------------------------------
    // 1. Collect card IDs to poll
    // ------------------------------------------------------------------

    // a) Cards in active alerts
    const { data: alertCards } = await supabase
      .from('tcg_price_alerts')
      .select('card_id')
      .eq('is_active', true);

    const alertCardIds = new Set<string>(
      (alertCards ?? []).map((r: { card_id: string }) => r.card_id),
    );

    // b) Top 100 cards by owned count from user_state (best-effort)
    // user_state JSONB column stores { owned: [{cardId, state}] } per user.
    // We aggregate across all users using a Postgres function or fallback to alert cards.
    // (Top-100 query requires a custom RPC or view — using alertCardIds as the primary set here.)

    const cardIds = [...alertCardIds];
    if (cardIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, ...results, note: 'no active alerts' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ------------------------------------------------------------------
    // 2. Fetch latest stored snapshot per card (for change detection)
    // ------------------------------------------------------------------
    const { data: latestRows } = await supabase
      .from('tcg_price_history')
      .select('card_id, tcgplayer_low, tcgplayer_mid, tcgplayer_high, cardmarket_avg, cardmarket_low, cardmarket_trend')
      .in('card_id', cardIds)
      .order('recorded_at', { ascending: false });

    const latestByCard = new Map<string, PriceSnapshot>();
    for (const row of latestRows ?? []) {
      if (!latestByCard.has(row.card_id)) {
        latestByCard.set(row.card_id, row as PriceSnapshot);
      }
    }

    // ------------------------------------------------------------------
    // 3. Fetch live prices from TCGdex and insert changed entries
    // ------------------------------------------------------------------
    const liveSnapshots = new Map<string, { snap: PriceSnapshot; card: TCGdexCard }>();

    const BATCH = 10;
    for (let i = 0; i < cardIds.length; i += BATCH) {
      const batch = cardIds.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (cardId) => {
          results.fetched++;
          const card = await fetchCardPricing(cardId);
          if (!card) { results.errors++; return; }

          const snap = extractPrices(card);
          const prev = latestByCard.get(cardId) ?? null;

          liveSnapshots.set(cardId, { snap, card });

          if (!snapshotChanged(prev, snap)) return;

          const { error } = await supabase.from('tcg_price_history').insert({
            card_id: card.id,
            card_name: card.name,
            set_id: card.set?.id ?? '',
            ...snap,
          });

          if (error) { results.errors++; console.error('[insert]', error); }
          else results.inserted++;
        }),
      );
    }

    // ------------------------------------------------------------------
    // 4. Check alert thresholds
    // ------------------------------------------------------------------
    const { data: activeAlerts } = await supabase
      .from('tcg_price_alerts')
      .select('*')
      .eq('is_active', true)
      .in('card_id', cardIds);

    for (const alert of (activeAlerts ?? []) as PriceAlert[]) {
      const live = liveSnapshots.get(alert.card_id);
      if (!live) continue;

      const { snap } = live;
      const currentPrice =
        alert.currency === 'EUR'
          ? (snap.cardmarket_trend ?? snap.cardmarket_avg ?? null)
          : (snap.tcgplayer_mid ?? snap.tcgplayer_low ?? null);

      if (currentPrice === null) continue;

      const threshold =
        alert.currency === 'EUR' ? alert.threshold_eur : alert.threshold_usd;
      if (threshold === null) continue;

      const triggered =
        alert.alert_type === 'below'
          ? currentPrice <= threshold
          : currentPrice >= threshold;

      if (!triggered) continue;

      // Update last_triggered_at
      await supabase
        .from('tcg_price_alerts')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', alert.id);

      results.alertsTriggered++;

      // Fetch push subscriptions for user
      if (!vapidPublicKey || !vapidPrivateKey) continue;

      const { data: subs } = await supabase
        .from('user_push_subscriptions')
        .select('subscription')
        .eq('user_id', alert.user_id);

      const direction = alert.alert_type === 'below' ? 'below' : 'above';
      const symbol = alert.currency === 'EUR' ? '€' : '$';
      const notifPayload = JSON.stringify({
        title: `Lunidex — Price Alert: ${alert.card_name}`,
        body: `Price is ${direction} ${symbol}${threshold.toFixed(2)} — current: ${symbol}${currentPrice.toFixed(2)}`,
        url: `/tcg/cards/${alert.card_id}`,
      });

      for (const row of (subs ?? []) as PushSubscriptionRow[]) {
        await sendWebPush(
          row.subscription,
          notifPayload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject,
        );
      }
    }
  } catch (err) {
    console.error('[poll-tcg-prices] fatal', err);
    results.errors++;
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
