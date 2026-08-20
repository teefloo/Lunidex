import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { getNeonClient } from '@/lib/neon/server';
import { isAllowedPushEndpoint } from '@/lib/push-endpoint';

interface PushSubscriptionJSON {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
}

interface SubscriptionPayload {
  subscription?: PushSubscriptionJSON;
  endpoint?: unknown;
}

function validSubscription(value: unknown): value is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const subscription = value as PushSubscriptionJSON;
  return (
    isAllowedPushEndpoint(subscription.endpoint) &&
    typeof subscription.keys?.p256dh === 'string' &&
    subscription.keys.p256dh.length > 0 &&
    subscription.keys.p256dh.length <= 512 &&
    typeof subscription.keys.auth === 'string' &&
    subscription.keys.auth.length > 0 &&
    subscription.keys.auth.length <= 512
  );
}

function validEndpoint(value: unknown): value is string {
  return isAllowedPushEndpoint(value);
}

export async function POST(request: NextRequest) {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await readJsonBody<SubscriptionPayload>(request);
  const subscription = body?.subscription;
  if (!validSubscription(subscription)) {
    return NextResponse.json({ error: 'A valid push subscription is required' }, { status: 400 });
  }

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    await sql`
      insert into public.user_push_subscriptions (user_id, subscription)
      values (${user.id}::uuid, ${JSON.stringify(subscription)}::jsonb)
      on conflict (user_id, ((subscription ->> 'endpoint')))
      do update set subscription = excluded.subscription
    `;
  } catch (error) {
    if (isInactiveAccountError(error)) {
      return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;

  const sql = getNeonClient();
  if (!sql) return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const body = await readJsonBody<SubscriptionPayload>(request);
  if (!validEndpoint(body?.endpoint)) {
    return NextResponse.json({ error: 'A valid subscription endpoint is required' }, { status: 400 });
  }

  await sql`
    delete from public.user_push_subscriptions
    where user_id = ${user.id}::uuid
      and subscription ->> 'endpoint' = ${body.endpoint}
  `;

  return NextResponse.json({ ok: true });
}
