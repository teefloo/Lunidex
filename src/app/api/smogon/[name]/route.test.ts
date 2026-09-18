import * as Sentry from '@sentry/nextjs';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';
import { resetSentryDeduplicationForTests } from '@/lib/sentry-observability';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback: (scope: { setTag: () => void; setContext: () => void }) => void) => {
    callback({ setTag: vi.fn(), setContext: vi.fn() });
  }),
}));

describe('Smogon proxy route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryDeduplicationForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('degrades gracefully when the upstream formats file returns a server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream unavailable', { status: 502 })));

    const response = await GET(
      new NextRequest('https://lunidex.app/api/smogon/trevenant'),
      { params: Promise.resolve({ name: 'trevenant' }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Lunidex upstream failure: Error', 'warning');
  });

  it('serves the last good formats payload when a warm cache refresh fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T00:00:00.000Z'));
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(
      JSON.stringify({ trevenant: { tier: 'OU' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )).mockRejectedValueOnce(new Error('network unavailable'));
    vi.stubGlobal('fetch', fetchMock);

    const initialResponse = await GET(
      new NextRequest('https://lunidex.app/api/smogon/trevenant'),
      { params: Promise.resolve({ name: 'trevenant' }) },
    );
    await expect(initialResponse.json()).resolves.toEqual({ tier: 'OU' });

    vi.setSystemTime(new Date('2026-09-19T00:00:01.000Z'));
    const staleResponse = await GET(
      new NextRequest('https://lunidex.app/api/smogon/trevenant'),
      { params: Promise.resolve({ name: 'trevenant' }) },
    );

    expect(staleResponse.status).toBe(200);
    await expect(staleResponse.json()).resolves.toEqual({ tier: 'OU' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
