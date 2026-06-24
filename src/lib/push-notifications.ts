'use client';

import { getSupabaseClient } from './supabase/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Returns true when the browser supports Web Push notifications.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

/**
 * Requests notification permission, subscribes via the service worker's
 * PushManager, and stores the resulting subscription in Supabase so the
 * Edge Function can reach this device.
 *
 * Returns the PushSubscription, or null if the user denies permission or
 * Supabase is not configured.
 *
 * @throws if serviceWorker registration fails.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
    return null;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  // Wait for the active service worker
  const registration = await navigator.serviceWorker.ready;

  // Retrieve or create push subscription
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    }));

  // Persist in Supabase (best-effort — no throw on failure)
  await storePushSubscription(subscription);

  return subscription;
}

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

/**
 * Unsubscribes from push and removes the subscription from Supabase.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await removePushSubscription(subscription);
  await subscription.unsubscribe();
}

// ---------------------------------------------------------------------------
// Supabase persistence
// ---------------------------------------------------------------------------

async function storePushSubscription(subscription: PushSubscription): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase.from('user_push_subscriptions').upsert(
    {
      user_id: session.user.id,
      subscription: subscription.toJSON(),
    },
    { onConflict: 'user_id, (subscription->>\'endpoint\')' },
  );

  if (error) {
    console.error('[push] Failed to store subscription:', error.message);
  }
}

async function removePushSubscription(subscription: PushSubscription): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const endpoint = subscription.endpoint;

  const { error } = await supabase
    .from('user_push_subscriptions')
    .delete()
    .eq('user_id', session.user.id)
    .eq('subscription->>endpoint', endpoint);

  if (error) {
    console.error('[push] Failed to remove subscription:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Send (server-side or testing utility)
// ---------------------------------------------------------------------------

/**
 * Sends a push notification payload to a specific subscription.
 * In production, prefer triggering this from the Edge Function using
 * the web-push library with full VAPID signing and RFC-8291 encryption.
 *
 * This client-side helper is intentionally minimal and useful for testing.
 * It calls the browser's Push endpoint directly but does NOT encrypt the body
 * (encryption requires the server to hold the private VAPID key).
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), payload }),
    });
    return res.ok;
  } catch (err) {
    console.error('[push] sendPushNotification error:', err);
    return false;
  }
}
