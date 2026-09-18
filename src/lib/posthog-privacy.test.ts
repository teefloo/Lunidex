import { describe, expect, it } from 'vitest';

import {
  normalizePostHogRoute,
  sanitizePostHogProperties,
} from './posthog-privacy';

describe('PostHog privacy helpers', () => {
  it('removes locale and personal route segments', () => {
    expect(normalizePostHogRoute('/fr/u/esteban?tab=collection')).toBe('/u/[handle]');
    expect(normalizePostHogRoute('https://lunidex.app/ja/friends/private-id?token=secret')).toBe('/friends/[friendId]');
  });

  it('drops sensitive values and keeps bounded low-cardinality context', () => {
    expect(sanitizePostHogProperties({
      email: 'trainer@example.com',
      authorization: 'Bearer very-secret-token',
      route: '/en/pokemon/pikachu?email=trainer@example.com',
      status: 503.8,
      duration_ms: 120.4,
      feature: 'pokemon',
    })).toEqual({
      route: '/pokemon/pikachu',
      status: 503,
      duration_ms: 120,
      feature: 'pokemon',
    });
  });

  it('redacts email and secret-looking text even in allowed context', () => {
    const properties = sanitizePostHogProperties({
      message: 'Login failed for trainer@example.com token=abc123',
    });

    expect(properties.message).toBe('Login failed for [redacted-email] token=[redacted]');
  });
});
