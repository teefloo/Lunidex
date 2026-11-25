import { describe, expect, it } from 'vitest';
import { resolveSupabaseAdminKey } from './server-auth';

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
