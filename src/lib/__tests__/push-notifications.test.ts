import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Supabase client — must be before the import under test
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'user-123' },
          },
        },
      }),
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    })),
  })),
}));

// ---------------------------------------------------------------------------
// Globals that JSDOM doesn't provide by default
// ---------------------------------------------------------------------------

const mockSubscription: PushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  expirationTime: null,
  options: { applicationServerKey: null, userVisibleOnly: true },
  getKey: vi.fn(),
  toJSON: vi.fn(() => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
  })),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager: PushManager = {
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
  getSubscription: vi.fn().mockResolvedValue(null),
  permissionState: vi.fn(),
};

const mockRegistration: ServiceWorkerRegistration = {
  pushManager: mockPushManager,
} as unknown as ServiceWorkerRegistration;

// ---------------------------------------------------------------------------
// Now import the module under test (after mocks are established)
// ---------------------------------------------------------------------------

import {
  isPushSupported,
  subscribeToPush,
  sendPushNotification,
} from '../push-notifications';

describe('push-notifications', () => {
  beforeEach(() => {
    // Notification API
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    // navigator.serviceWorker
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration),
        },
      },
    });
    // VAPID public key env var
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BDummyVapidPublicKeyForTesting1234567890ABCD');
    // PushManager on window
    vi.stubGlobal('PushManager', {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Test 1: subscribeToPush calls serviceWorker.ready
  // -------------------------------------------------------------------------

  it('subscribeToPush calls navigator.serviceWorker.ready', async () => {
    const readySpy = vi.spyOn(
      navigator.serviceWorker as unknown as { ready: Promise<ServiceWorkerRegistration> },
      'ready',
      'get',
    ).mockReturnValue(Promise.resolve(mockRegistration));

    await subscribeToPush();

    expect(readySpy).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 2: sendPushNotification formats payload correctly
  // -------------------------------------------------------------------------

  it('sendPushNotification sends correctly formatted payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const payload = { title: 'Test alert', body: 'Price dropped!', url: '/tcg/cards/swsh1-1' };
    await sendPushNotification(mockSubscription, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      subscription: ReturnType<typeof mockSubscription.toJSON>;
      payload: typeof payload;
    };
    expect(callBody.payload.title).toBe('Test alert');
    expect(callBody.payload.body).toBe('Price dropped!');
    expect(callBody.subscription.endpoint).toBe(mockSubscription.endpoint);
  });

  // -------------------------------------------------------------------------
  // Test 3: isPushSupported returns false in non-browser env
  // -------------------------------------------------------------------------

  it('isPushSupported returns false when window is undefined', () => {
    // In JSDOM 'window' is defined, so we test the PushManager absence path.
    const original = (globalThis as { PushManager?: unknown }).PushManager;
    delete (globalThis as { PushManager?: unknown }).PushManager;

    expect(isPushSupported()).toBe(false);

    (globalThis as { PushManager?: unknown }).PushManager = original;
  });
});
