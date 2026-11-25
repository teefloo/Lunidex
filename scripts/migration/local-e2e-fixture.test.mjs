import assert from 'node:assert/strict';
import test from 'node:test';
import { localFixtureTestValues, parseLocalSupabaseStatusEnv, validateLocalFixtureTarget } from './local-e2e-fixture.mjs';

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
});

test('local CLI status parser captures only the values needed and rejects incomplete output', () => {
  const values = parseLocalSupabaseStatusEnv([
    'API_URL="http://127.0.0.1:54321"',
    'DB_URL="postgresql://postgres:local-only@127.0.0.1:54322/postgres"',
    'ANON_KEY="ignored-public-key"',
    'SERVICE_ROLE_KEY="local-service-role-key"',
  ].join('\n'));
  assert.deepEqual(values, {
    API_URL: 'http://127.0.0.1:54321',
    DB_URL: 'postgresql://postgres:local-only@127.0.0.1:54322/postgres',
    SERVICE_ROLE_KEY: 'local-service-role-key',
  });
  assert.throws(() => parseLocalSupabaseStatusEnv('API_URL="http://127.0.0.1:54321"'), /did not provide/);
});
