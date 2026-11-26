import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureLocalSupabaseAdminKey,
  localFixtureTestValues,
  parseLocalSupabaseStatusEnv,
  validateLocalFixtureTarget,
} from './local-e2e-fixture.mjs';

const localTarget = {
  projectRef: 'local',
  apiUrl: 'http://127.0.0.1:54321',
  databaseUrl: 'postgresql://postgres:local-only@127.0.0.1:54322/postgres',
};

test('synthetic fixture target is limited to local Supabase loopback endpoints', () => {
  assert.deepEqual(validateLocalFixtureTarget(localTarget), {
    apiUrl: 'http://127.0.0.1:54321',
    databaseUrl: localTarget.databaseUrl,
  });
  assert.throws(
    () => validateLocalFixtureTarget({ ...localTarget, projectRef: 'lunidex-staging' }),
    /only accepts SUPABASE_PROJECT_REF=local/,
  );
  assert.throws(
    () => validateLocalFixtureTarget({ ...localTarget, apiUrl: 'https://lunidex-staging.supabase.co' }),
    /local Supabase API on loopback/,
  );
  assert.throws(
    () => validateLocalFixtureTarget({ ...localTarget, databaseUrl: 'postgresql://postgres:secret@db.lunidex-staging.supabase.co:5432/postgres' }),
    /local Supabase database on loopback/,
  );
});

test('fixture uses only reviewed synthetic identity values', () => {
  assert.equal(localFixtureTestValues.FIXTURE_DATABASE, 'lunidex_neon_fixture');
  assert.match(localFixtureTestValues.FIXTURE_EMAIL, /@lunidex\.invalid$/);
  assert.match(localFixtureTestValues.FIXTURE_USER_ID, /^[0-9a-f-]{36}$/i);
  assert.ok(localFixtureTestValues.FIXTURE_SCORE >= 0 && localFixtureTestValues.FIXTURE_SCORE <= 10);
});

test('local CLI parser prefers SECRET_KEY when present and retains legacy SERVICE_ROLE_KEY compatibility', () => {
  const values = parseLocalSupabaseStatusEnv([
    'API_URL="http://127.0.0.1:54321"',
    'DB_URL="postgresql://postgres:local-only@127.0.0.1:54322/postgres"',
    'ANON_KEY="ignored-public-key"',
    'SECRET_KEY="sb_secret_local_synthetic"',
    'SERVICE_ROLE_KEY="local-service-role-key"',
  ].join('\n'));
  assert.deepEqual(values, {
    API_URL: 'http://127.0.0.1:54321',
    DB_URL: 'postgresql://postgres:local-only@127.0.0.1:54322/postgres',
    SECRET_KEY: 'sb_secret_local_synthetic',
    SERVICE_ROLE_KEY: 'local-service-role-key',
  });

  const targetEnv = {
    SUPABASE_SECRET_KEY: 'inherited-secret-must-not-win',
    SUPABASE_SERVICE_ROLE_KEY: 'inherited-legacy-must-not-win',
  };
  assert.equal(configureLocalSupabaseAdminKey(values, targetEnv), 'SUPABASE_SECRET_KEY');
  assert.equal(targetEnv.SUPABASE_SECRET_KEY, 'sb_secret_local_synthetic');
  assert.equal(targetEnv.SUPABASE_SERVICE_ROLE_KEY, undefined);
});

test('local CLI fixture falls back to SERVICE_ROLE_KEY only when SECRET_KEY is absent', () => {
  const values = parseLocalSupabaseStatusEnv([
    'API_URL="http://127.0.0.1:54321"',
    'DB_URL="postgresql://postgres:local-only@127.0.0.1:54322/postgres"',
    'SERVICE_ROLE_KEY="local-service-role-key"',
  ].join('\n'));
  const targetEnv = {};
  assert.equal(configureLocalSupabaseAdminKey(values, targetEnv), 'SUPABASE_SERVICE_ROLE_KEY');
  assert.equal(targetEnv.SUPABASE_SECRET_KEY, undefined);
  assert.equal(targetEnv.SUPABASE_SERVICE_ROLE_KEY, 'local-service-role-key');
  assert.throws(() => parseLocalSupabaseStatusEnv('API_URL="http://127.0.0.1:54321"'), /did not provide/);
});
