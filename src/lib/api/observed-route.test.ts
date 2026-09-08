import * as Sentry from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withObservedRouteHandler } from './observed-route';
import { resetSentryDeduplicationForTests } from '@/lib/sentry-observability';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  getClient: vi.fn(() => ({})),
  withScope: vi.fn((callback: (scope: { setTag: () => void; setContext: () => void }) => void) => {
    callback({ setTag: vi.fn(), setContext: vi.fn() });
  }),
}));

describe('observed route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryDeduplicationForTests();
  });

  it('reports server responses without reading the request body', async () => {
    const request = new Request('https://lunidex.app/api/profile', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', secret: 'private' }),
    });
    const handler = withObservedRouteHandler('/api/profile', 'profile', async (request: Request) => {
      void request;
      return Response.json({ error: 'unavailable' }, { status: 503 });
    });

    const response = await handler(request);

    expect(response.status).toBe(503);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.flush).toHaveBeenCalledWith(1500);
    expect(JSON.stringify(vi.mocked(Sentry.captureException).mock.calls)).not.toContain('user@example.com');
  });

  it('captures and rethrows unexpected handler exceptions', async () => {
    const error = new Error('database failed');
    const handler = withObservedRouteHandler('/api/tcg/cards/:id', 'tcg', async (request: Request) => {
      void request;
      throw error;
    });

    await expect(handler(new Request('https://lunidex.app/api/tcg/cards/secret'))).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.flush).toHaveBeenCalledWith(1500);
  });

  it('ignores expected client error responses', async () => {
    const handler = withObservedRouteHandler('/api/profile', 'profile', async (request: Request) => {
      void request;
      return Response.json({ error: 'not found' }, { status: 404 });
    });

    await handler(new Request('https://lunidex.app/api/profile'));

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
