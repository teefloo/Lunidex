import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  getNeonClient: vi.fn(),
  getNeonUserFromRequest: vi.fn(),
  ensureNeonUser: vi.fn(),
  reportSentryException: vi.fn(),
}));

vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getNeonClient }));
vi.mock('@/lib/neon/auth', () => ({ getNeonUserFromRequest: mocks.getNeonUserFromRequest, ensureNeonUser: mocks.ensureNeonUser }));
vi.mock('@/lib/neon/errors', () => ({ isInactiveAccountError: () => false }));
vi.mock('@/lib/rate-limit', () => ({ ipKey: () => 'test', rateLimit: () => true }));
vi.mock('@/lib/sentry-observability', () => ({ reportSentryException: mocks.reportSentryException }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));

import { GET } from './route';

describe('quiz leaderboard API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getNeonClient.mockReturnValue(mocks.sql);
    mocks.getNeonUserFromRequest.mockResolvedValue(null);
  });

  it('returns unavailable and reports the exception when the ranking query fails', async () => {
    const error = new Error('Neon database is over quota');
    mocks.sql.mockRejectedValue(error);

    const response = await GET(new NextRequest('https://lunidex.test/api/quiz/leaderboard?period=day'));

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ error: 'Leaderboard unavailable' });
    expect(mocks.reportSentryException).toHaveBeenCalledWith(error, {
      feature: 'quiz',
      route: '/api/quiz/leaderboard',
      method: 'GET',
      operation: 'leaderboard-read',
    });
  });
});
