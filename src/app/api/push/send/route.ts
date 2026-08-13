import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { readJsonBody } from '@/lib/api/route-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';
import { isAllowedPushEndpoint } from '@/lib/push-endpoint';

interface SendPushPayload {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  payload?: { title?: string; body?: string; url?: string };
}

let vapidConfigured = false;
const WEB_PUSH_TIMEOUT_MS = 5_000;
function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

// Sends a single push notification. Requires authentication so this route
// can't be used as an open push-spam relay; in production the actual price
// checks that trigger sends should run from a scheduled server job iterating
// `tcg_price_alerts` + `user_push_subscriptions`, calling
// this same web-push logic server-side. This route also doubles as the
// manual "send test notification" path used by the client-side helper in
// `src/lib/push-notifications.ts`.
export async function POST(request: NextRequest) {
  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });

  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rateLimit(`push-send:${user.id}`, 5)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!ensureVapidConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured on this server' }, { status: 503 });
  }

  const body = await readJsonBody<SendPushPayload>(request);
  const subscription = body?.subscription;
  const payload = body?.payload;

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return NextResponse.json({ error: 'A valid subscription is required' }, { status: 400 });
  }
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    return NextResponse.json({ error: 'Invalid subscription endpoint' }, { status: 400 });
  }
  if (
    typeof payload?.title !== 'string' ||
    typeof payload.body !== 'string' ||
    !payload.title ||
    !payload.body ||
    payload.title.length > 120 ||
    payload.body.length > 1000
  ) {
    return NextResponse.json({ error: 'payload.title and payload.body are required' }, { status: 400 });
  }
  if (payload.url && (!payload.url.startsWith('/') || payload.url.startsWith('//'))) {
    return NextResponse.json({ error: 'payload.url must be a relative URL' }, { status: 400 });
  }

  const ownedRows = await sql`
    select id
    from public.user_push_subscriptions
    where user_id = ${user.id}::uuid
      and subscription ->> 'endpoint' = ${subscription.endpoint}
    limit 1
  `;
  if (ownedRows.length === 0) {
    return NextResponse.json({ error: 'Subscription is not registered for this user' }, { status: 403 });
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      JSON.stringify(payload),
      { timeout: WEB_PUSH_TIMEOUT_MS },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : undefined;
    console.error('[push/send] Failed to send notification:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      statusCode,
    });
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 502 });
  }
}
