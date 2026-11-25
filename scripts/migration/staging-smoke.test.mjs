import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStagingSmokeConfig, withDatabaseTransaction } from './staging-smoke.mjs';

const stagingConfig = {
  LUNIDEX_STAGING_SMOKE: 'I_CONFIRM_LUNIDEX_STAGING_DATA_MUTATION',
  LUNIDEX_STAGING_PROJECT_REF: 'lunidex-stage-test-123',
  SUPABASE_PROJECT_REF: 'lunidex-stage-test-123',
  SUPABASE_URL: 'https://lunidex-stage-test-123.supabase.co',
  LUNIDEX_STAGING_APP_URL: 'https://staging.lunidex.app',
  SUPABASE_DATABASE_URL: 'postgresql://postgres.lunidex-stage-test-123:fake@aws-0-eu-west-3.pooler.supabase.com:5432/postgres',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-test-publishable-key',
  SUPABASE_SERVICE_ROLE_KEY: 'local-test-service-role-key',
};

test('staging smoke config accepts only the dedicated ref, API, database, app origin and explicit opt-in', () => {
  assert.equal(validateStagingSmokeConfig(stagingConfig).apiUrl, 'https://lunidex-stage-test-123.supabase.co');
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, SUPABASE_PROJECT_REF: 'another-project' }),
    /exactly match the generated LUNIDEX_STAGING_PROJECT_REF/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, SUPABASE_URL: 'https://some-production-project.supabase.co' }),
    /hostname must exactly match/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, LUNIDEX_STAGING_APP_URL: 'https://lunidex.app' }),
    /exact loopback origin on port 3000 or an explicit HTTPS staging subdomain/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, LUNIDEX_STAGING_APP_URL: 'https://attacker.example.test' }),
    /exact loopback origin on port 3000 or an explicit HTTPS staging subdomain/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, SUPABASE_DATABASE_URL: 'postgresql://postgres.other:fake@aws-0-eu-west-3.pooler.supabase.com:5432/postgres' }),
    /Shared Pooler session endpoint on port 5432/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({
      ...stagingConfig,
      LUNIDEX_STAGING_PROJECT_REF: 'pimauymeakxbvxdangbx',
      SUPABASE_PROJECT_REF: 'pimauymeakxbvxdangbx',
      SUPABASE_URL: 'https://pimauymeakxbvxdangbx.supabase.co',
      SUPABASE_DATABASE_URL: 'postgresql://postgres.pimauymeakxbvxdangbx:fake@aws-0-eu-west-3.pooler.supabase.com:5432/postgres',
    }),
    /exactly match the generated LUNIDEX_STAGING_PROJECT_REF/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, SUPABASE_DATABASE_URL: 'postgresql://postgres.lunidex-stage-test-123:fake@aws-0-eu-west-3.pooler.supabase.com:6543/postgres' }),
    /Shared Pooler session endpoint on port 5432/,
  );
  assert.throws(
    () => validateStagingSmokeConfig({ ...stagingConfig, LUNIDEX_STAGING_SMOKE: undefined }),
    /only when intentionally running/,
  );
});

test('staging smoke accepts only exact localhost app origins and rejects non-loopback or decorated URLs', () => {
  for (const appUrl of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
    assert.equal(
      validateStagingSmokeConfig({ ...stagingConfig, LUNIDEX_STAGING_APP_URL: appUrl }).appOrigin,
      appUrl,
    );
  }

  for (const appUrl of [
    'http://localhost:3001',
    'http://192.168.1.20:3000',
    'http://localhost.evil.test:3000',
    'http://user@localhost:3000',
    'http://localhost:3000/fr',
    'http://127.0.0.1:3000?next=/auth/callback',
  ]) {
    assert.throws(
      () => validateStagingSmokeConfig({ ...stagingConfig, LUNIDEX_STAGING_APP_URL: appUrl }),
      /exact loopback origin on port 3000 or an explicit HTTPS staging subdomain/,
      appUrl,
    );
  }
});

test('staging projection seed transaction pins begin, writes, commit and release to one client', async () => {
  const calls = [];
  let connectCount = 0;
  const client = {
    query: async (sql) => { calls.push(sql); return { rows: [] }; },
    release: () => calls.push('release'),
  };
  const pool = {
    connect: async () => { connectCount += 1; return client; },
    query: async () => { throw new Error('pool.query must not be used inside the checked-out transaction'); },
  };

  await withDatabaseTransaction(pool, async (transactionClient) => {
    await transactionClient.query('insert synthetic projections');
  });

  assert.equal(connectCount, 1);
  assert.deepEqual(calls, ['begin', 'insert synthetic projections', 'commit', 'release']);
});

test('staging projection transaction rolls back on failure and still releases its client', async () => {
  const calls = [];
  const client = {
    query: async (sql) => { calls.push(sql); return { rows: [] }; },
    release: () => calls.push('release'),
  };
  const pool = { connect: async () => client };

  await assert.rejects(
    withDatabaseTransaction(pool, async (transactionClient) => {
      await transactionClient.query('insert synthetic projections');
      throw new Error('seed failed');
    }),
    /seed failed/,
  );

  assert.deepEqual(calls, ['begin', 'insert synthetic projections', 'rollback', 'release']);
});
