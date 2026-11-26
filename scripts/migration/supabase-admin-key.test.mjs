import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSupabaseAdminKey } from './supabase-admin-key.mjs';

test('Supabase admin key prefers SUPABASE_SECRET_KEY over the legacy service-role key', () => {
  assert.equal(requireSupabaseAdminKey({
    SUPABASE_SECRET_KEY: 'sb_secret_synthetic_test',
    SUPABASE_SERVICE_ROLE_KEY: 'legacy_synthetic_test',
  }), 'sb_secret_synthetic_test');
});

test('Supabase admin key falls back to SUPABASE_SERVICE_ROLE_KEY for compatibility', () => {
  assert.equal(requireSupabaseAdminKey({ SUPABASE_SERVICE_ROLE_KEY: 'legacy_synthetic_test' }), 'legacy_synthetic_test');
});

test('missing Supabase admin key reports variable names without exposing a value', () => {
  assert.throws(
    () => requireSupabaseAdminKey({}),
    (error) => {
      assert.match(error.message, /SUPABASE_SECRET_KEY/);
      assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY/);
      assert.doesNotMatch(error.message, /sb_secret|legacy_synthetic_test/);
      return true;
    },
  );
});
