import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanupSyntheticSmokeAccounts,
  CLEANUP_OPT_IN,
  validateHostedCleanupConfig,
} from './cleanup-hosted-smoke.mjs';
import {
  isSyntheticSmokeUser,
  LUNIDEX_PROJECT_REF,
  SYNTHETIC_SMOKE_METADATA_KEY,
  SYNTHETIC_SMOKE_TAG,
} from './hosted-smoke-constants.mjs';

const cleanupConfig = {
  LUNIDEX_HOSTED_SMOKE_CLEANUP: CLEANUP_OPT_IN,
  SUPABASE_PROJECT_REF: LUNIDEX_PROJECT_REF,
  SUPABASE_URL: `https://${LUNIDEX_PROJECT_REF}.supabase.co`,
  SUPABASE_DATABASE_URL: `postgresql://postgres.${LUNIDEX_PROJECT_REF}:fake@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`,
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic_test',
  SUPABASE_SERVICE_ROLE_KEY: 'local-test-service-role-key',
};

const markedUser = {
  id: '79f962b5-fd38-4ed9-b25f-33ed495ce5d7',
  email: 'lunidex-migration-smoke+79f962b5-fd38-4ed9-b25f-33ed495ce5d7@lunidex.app',
  app_metadata: { [SYNTHETIC_SMOKE_METADATA_KEY]: SYNTHETIC_SMOKE_TAG },
};

test('hosted cleanup requires explicit opt-in and the fixed Lunidex ref across all target coordinates', () => {
  assert.equal(validateHostedCleanupConfig(cleanupConfig).projectRef, LUNIDEX_PROJECT_REF);
  assert.equal(validateHostedCleanupConfig(cleanupConfig).adminKey, 'sb_secret_synthetic_test');
  assert.equal(validateHostedCleanupConfig({
    ...cleanupConfig,
    SUPABASE_DATABASE_URL: `${cleanupConfig.SUPABASE_DATABASE_URL}?sslmode=verify-full`,
  }).projectRef, LUNIDEX_PROJECT_REF);
  assert.throws(
    () => validateHostedCleanupConfig({ ...cleanupConfig, LUNIDEX_HOSTED_SMOKE_CLEANUP: undefined }),
    /only when intentionally removing marked synthetic/,
  );

  for (const ref of ['another-project-ref', 'pimauymeakxbvxdangbx']) {
    assert.throws(
      () => validateHostedCleanupConfig({
        ...cleanupConfig,
        SUPABASE_PROJECT_REF: ref,
        SUPABASE_URL: `https://${ref}.supabase.co`,
        SUPABASE_DATABASE_URL: `postgresql://postgres.${ref}:fake@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`,
      }),
      /exactly match the fixed Lunidex project ref/,
    );
  }

  assert.throws(
    () => validateHostedCleanupConfig({ ...cleanupConfig, SUPABASE_URL: 'https://other.supabase.co' }),
    /fixed Lunidex project API/,
  );
  assert.throws(
    () => validateHostedCleanupConfig({ ...cleanupConfig, SUPABASE_DATABASE_URL: 'postgresql://postgres.other:fake@aws-0-eu-west-3.pooler.supabase.com:5432/postgres' }),
    /fixed Lunidex Shared Pooler/,
  );
  assert.throws(
    () => validateHostedCleanupConfig({
      ...cleanupConfig,
      SUPABASE_DATABASE_URL: `${cleanupConfig.SUPABASE_DATABASE_URL}?sslmode=no-verify`,
    }),
    /fixed Lunidex Shared Pooler/,
  );
  assert.throws(
    () => validateHostedCleanupConfig({
      ...cleanupConfig,
      SUPABASE_DATABASE_URL: `${cleanupConfig.SUPABASE_DATABASE_URL}?sslmode=require`,
    }),
    /fixed Lunidex Shared Pooler/,
  );
  const passwordMarker = 'synthetic-db-password-marker';
  assert.throws(
    () => validateHostedCleanupConfig({
      ...cleanupConfig,
      SUPABASE_DATABASE_URL: `postgresql://postgres:${passwordMarker}@bad host:5432/postgres`,
    }),
    (error) => {
      assert.match(error.message, /valid PostgreSQL URL/);
      assert.doesNotMatch(error.message, new RegExp(passwordMarker));
      return true;
    },
  );
  assert.throws(
    () => validateHostedCleanupConfig({
      ...cleanupConfig,
      SUPABASE_DATABASE_URL: `${cleanupConfig.SUPABASE_DATABASE_URL}#${passwordMarker}`,
    }),
    (error) => {
      assert.match(error.message, /fixed Lunidex Shared Pooler/);
      assert.doesNotMatch(error.message, new RegExp(passwordMarker));
      return true;
    },
  );
  assert.equal(validateHostedCleanupConfig({
    ...cleanupConfig,
    SUPABASE_SECRET_KEY: undefined,
  }).adminKey, 'local-test-service-role-key');
  assert.throws(
    () => validateHostedCleanupConfig({
      ...cleanupConfig,
      SUPABASE_SECRET_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    }),
    (error) => {
      assert.match(error.message, /SUPABASE_SECRET_KEY/);
      assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY/);
      assert.doesNotMatch(error.message, /sb_secret_synthetic_test|local-test-service-role-key/);
      return true;
    },
  );
});

test('synthetic account selector requires the reserved Lunidex smoke address and admin metadata marker', () => {
  assert.equal(isSyntheticSmokeUser(markedUser), true);
  assert.equal(isSyntheticSmokeUser({ ...markedUser, email: 'person@lunidex.app' }), false);
  assert.equal(isSyntheticSmokeUser({ ...markedUser, email: 'lunidex-migration-smoke+abc@lunidex.app' }), false);
  assert.equal(isSyntheticSmokeUser({
    ...markedUser,
    app_metadata: {},
    user_metadata: { [SYNTHETIC_SMOKE_METADATA_KEY]: SYNTHETIC_SMOKE_TAG },
  }), false);
});

function createCleanupMocks({ users, orphanIds = [] }) {
  const deletedAuthIds = [];
  const deletedProjectionIds = [];
  const liveUsers = [...users];
  const admin = {
    auth: {
      admin: {
        listUsers: async ({ page, perPage }) => ({
          data: { users: liveUsers.slice((page - 1) * perPage, page * perPage) },
          error: null,
        }),
        deleteUser: async (id) => {
          deletedAuthIds.push(id);
          const index = liveUsers.findIndex((user) => user.id === id);
          if (index >= 0) liveUsers.splice(index, 1);
          return { data: {}, error: null };
        },
      },
    },
  };
  const pool = {
    query: async (sql) => {
      if (sql.includes('select exists(')) return { rows: [{ marked_projection_remains: false }] };
      if (sql.includes('from public.profiles')) {
        return {
          rows: orphanIds.map((id) => ({
            id,
            email: `lunidex-migration-smoke+${id}@lunidex.app`,
            name: `Synthetic Lunidex hosted smoke [${SYNTHETIC_SMOKE_TAG}]`,
            state_marker: SYNTHETIC_SMOKE_TAG,
          })),
        };
      }
      throw new Error('Unexpected pool-level query');
    },
    connect: async () => ({
      query: async (sql, values = []) => {
        if (sql === 'delete from app.users where id = any($1::uuid[])') {
          deletedProjectionIds.push(...values[0]);
          return { rowCount: values[0].length, rows: [] };
        }
        if (sql.includes('from app.users where id = any($1::uuid[])')) {
          return { rows: [{ app_users_remain: false, profiles_remain: false, user_state_remains: false }] };
        }
        if (sql.includes('from auth.users where id = any($1::uuid[])')) {
          return { rows: [{ auth_users_remain: false, app_users_remain: false, profiles_remain: false, user_state_remains: false }] };
        }
        return { rows: [] };
      },
      release() {},
    }),
  };
  return { admin, pool, deletedAuthIds, deletedProjectionIds, liveUsers };
}

test('cleanup deletes only fully marked Auth accounts and their matching UUID projections', async () => {
  const unrelated = {
    id: 'b30c88e5-bda6-4a85-9f16-65520a8ad2ce',
    email: 'real-user@lunidex.app',
    app_metadata: {},
  };
  const mocks = createCleanupMocks({ users: [markedUser, unrelated] });

  const result = await cleanupSyntheticSmokeAccounts(mocks);

  assert.deepEqual(result, { deletedCount: 1 });
  assert.deepEqual(mocks.deletedAuthIds, [markedUser.id]);
  assert.deepEqual(mocks.deletedProjectionIds, [markedUser.id]);
  assert.deepEqual(mocks.liveUsers, [unrelated]);
});

test('cleanup leaves a reserved-prefix Auth user untouched when its admin marker is missing', async () => {
  const unmarked = { ...markedUser, app_metadata: {} };
  const mocks = createCleanupMocks({ users: [unmarked] });

  const result = await cleanupSyntheticSmokeAccounts(mocks);

  assert.deepEqual(result, { deletedCount: 0 });
  assert.deepEqual(mocks.deletedAuthIds, []);
  assert.deepEqual(mocks.deletedProjectionIds, []);
  assert.deepEqual(mocks.liveUsers, [unmarked]);
});

test('cleanup recovers marker-tagged projections left after Auth deletion', async () => {
  const orphanId = 'a2f4511a-f5e4-46f2-bfb4-4cec8fb52272';
  const mocks = createCleanupMocks({ users: [], orphanIds: [orphanId] });

  const result = await cleanupSyntheticSmokeAccounts(mocks);

  assert.deepEqual(result, { deletedCount: 0 });
  assert.deepEqual(mocks.deletedAuthIds, []);
  assert.deepEqual(mocks.deletedProjectionIds, [orphanId]);
});

test('cleanup fails closed when a reserved-email projection belongs to an unmarked live Auth account', async () => {
  const unmarked = { ...markedUser, app_metadata: {} };
  const mocks = createCleanupMocks({ users: [unmarked], orphanIds: [markedUser.id] });

  await assert.rejects(
    cleanupSyntheticSmokeAccounts(mocks),
    /belongs to an unmarked Auth user/,
  );
  assert.deepEqual(mocks.deletedAuthIds, []);
  assert.deepEqual(mocks.deletedProjectionIds, []);
});

test('cleanup fails closed when projection markers do not have the reserved synthetic address', async () => {
  const mocks = createCleanupMocks({ users: [], orphanIds: ['a2f4511a-f5e4-46f2-bfb4-4cec8fb52272'] });
  mocks.pool.query = async (sql) => {
    if (sql.includes('from public.profiles')) return { rows: [{
      id: 'a2f4511a-f5e4-46f2-bfb4-4cec8fb52272',
      email: 'real-user@lunidex.app',
      name: `Synthetic Lunidex hosted smoke [${SYNTHETIC_SMOKE_TAG}]`,
      state_marker: SYNTHETIC_SMOKE_TAG,
    }] };
    return { rows: [{ marked_projection_remains: false }] };
  };

  await assert.rejects(
    cleanupSyntheticSmokeAccounts(mocks),
    /lacked its reserved Lunidex smoke address/,
  );
  assert.deepEqual(mocks.deletedAuthIds, []);
  assert.deepEqual(mocks.deletedProjectionIds, []);
});
