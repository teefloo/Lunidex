import { describe, expect, it } from 'vitest';
import { isAllowedSupabaseAuthUser, isSupabaseAuthErrorUnavailable, resolveSupabaseAdminKey } from './server-auth';

describe('resolveSupabaseAdminKey', () => {
  it('prefers the new secret key when both keys are configured', () => {
    expect(resolveSupabaseAdminKey({
      SUPABASE_SECRET_KEY: 'sb_secret_synthetic_test',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy_synthetic_test',
    })).toBe('sb_secret_synthetic_test');
  });

  it('uses the legacy service-role key as a temporary fallback', () => {
    expect(resolveSupabaseAdminKey({ SUPABASE_SERVICE_ROLE_KEY: 'legacy_synthetic_test' })).toBe('legacy_synthetic_test');
  });

  it('returns no key when neither server key is configured', () => {
    expect(resolveSupabaseAdminKey({})).toBeNull();
  });
});

describe('isAllowedSupabaseAuthUser', () => {
  const ownerId = '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660';
  const otherId = 'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37';
  const env = { SUPABASE_ALLOWED_USER_ID: ownerId };

  it('allows only the configured UUID when its email is confirmed', () => {
    expect(isAllowedSupabaseAuthUser({
      id: ownerId,
      email: 'owner@example.test',
      email_confirmed_at: '2026-11-26T10:00:00.000Z',
    }, env)).toBe(true);
  });

  it('denies a different existing account without changing any account data', () => {
    expect(isAllowedSupabaseAuthUser({
      id: otherId,
      email: 'other@example.test',
      email_confirmed_at: '2026-11-26T10:00:00.000Z',
    }, env)).toBe(false);
  });

  it('denies an unverified email even when the UUID matches', () => {
    expect(isAllowedSupabaseAuthUser({ id: ownerId, email: 'owner@example.test', email_confirmed_at: null }, env)).toBe(false);
  });

  it('fails closed when the allowlist is missing or malformed', () => {
    const user = { id: ownerId, email: 'owner@example.test', email_confirmed_at: '2026-11-26T10:00:00.000Z' };
    expect(isAllowedSupabaseAuthUser(user, {})).toBe(false);
    expect(isAllowedSupabaseAuthUser(user, { SUPABASE_ALLOWED_USER_ID: 'not-a-uuid' })).toBe(false);
  });
});

describe('isSupabaseAuthErrorUnavailable', () => {
  it('keeps quota and provider failures distinct from invalid sessions', () => {
    expect(isSupabaseAuthErrorUnavailable({ status: 402, message: 'quota exceeded' })).toBe(true);
    expect(isSupabaseAuthErrorUnavailable({ status: 503, message: 'temporarily unavailable' })).toBe(true);
    expect(isSupabaseAuthErrorUnavailable({ status: 401, message: 'invalid token' })).toBe(false);
  });
});
