import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabaseServerClient, bearerToken } from '@/lib/supabase/server';
import { readJsonBody } from '@/lib/api/route-helpers';

interface SendPushPayload {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  payload?: { title?: string; body?: string; url?: string };
}

let vapidConfigured = false;
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
// checks that trigger sends should run from a scheduled Supabase Edge
// Function iterating `tcg_price_alerts` + `user_push_subscriptions`, calling
// this same web-push logic server-side. This route also doubles as the
// manual "send test notification" path used by the client-side helper in
// `src/lib/push-notifications.ts`.
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient(bearerToken(request.headers.get('Authorization')) ?? undefined);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  if (!payload?.title || !payload.body) {
    return NextResponse.json({ error: 'payload.title and payload.body are required' }, { status: 400 });
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      JSON.stringify(payload),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push/send] Failed to send notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 502 });
  }
}
