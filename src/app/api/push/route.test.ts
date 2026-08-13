import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetNeonUserFromRequest = vi.hoisted(() => vi.fn());
const mockEnsureNeonUser = vi.hoisted(() => vi.fn());
const mockSql = vi.hoisted(() => vi.fn());
const mockSendNotification = vi.hoisted(() => vi.fn());
const mockSetVapidDetails = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/auth', () => ({
  ensureNeonUser: mockEnsureNeonUser,
  getNeonUserFromRequest: mockGetNeonUserFromRequest,
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => mockSql,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => true,
}));

vi.mock('web-push', () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
}));

import { POST as sendPush } from './send/route';
import { POST as saveSubscription } from './subscription/route';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const VALID_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/browser-token',
  keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
};
const VALID_PAYLOAD = { title: 'Test alert', body: 'Price dropped!', url: '/tcg' };

function request(path: string, body: unknown) {
  return new NextRequest(`https://lunidex.test${path}`, {
    method: 'POST',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('push endpoint security boundaries', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset();
    mockEnsureNeonUser.mockReset();
    mockSql.mockReset();
    mockSendNotification.mockReset();
    mockSetVapidDetails.mockReset();
    mockGetNeonUserFromRequest.mockResolvedValue({ id: USER_ID, email: 'ash@example.test', user_metadata: { name: 'Ash' } });
    mockEnsureNeonUser.mockResolvedValue(undefined);
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BDummyVapidPublicKeyForTesting1234567890ABCD');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'dummy-private-key');
    vi.stubEnv('VAPID_SUBJECT', 'mailto:security@lunidex.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unapproved subscription providers before persistence', async () => {
    const response = await saveSubscription(request('/api/push/subscription', {
      subscription: {
        ...VALID_SUBSCRIPTION,
        endpoint: 'https://attacker.example/collect',
      },
    }));

    expect(response.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects an unapproved send endpoint before the ownership lookup', async () => {
    const response = await sendPush(request('/api/push/send', {
      subscription: {
        ...VALID_SUBSCRIPTION,
        endpoint: 'https://attacker.example/collect',
      },
      payload: VALID_PAYLOAD,
    }));

    expect(response.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('requires the endpoint to belong to the authenticated user', async () => {
    mockSql.mockResolvedValueOnce([]);

    const response = await sendPush(request('/api/push/send', {
      subscription: VALID_SUBSCRIPTION,
      payload: VALID_PAYLOAD,
    }));

    expect(response.status).toBe(403);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('passes a bounded socket timeout when sending an owned subscription', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'subscription-id' }]);

    const response = await sendPush(request('/api/push/send', {
      subscription: VALID_SUBSCRIPTION,
      payload: VALID_PAYLOAD,
    }));

    expect(response.status).toBe(200);
    expect(mockSendNotification).toHaveBeenCalledWith(
      VALID_SUBSCRIPTION,
      JSON.stringify(VALID_PAYLOAD),
      { timeout: 5_000 },
    );
  });
});
