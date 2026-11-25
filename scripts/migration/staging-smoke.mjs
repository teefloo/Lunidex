#!/usr/bin/env node

import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_OPT_IN = 'I_CONFIRM_LUNIDEX_STAGING_DATA_MUTATION';
const APP_API_OPT_IN = 'I_CONFIRM_LUNIDEX_STAGING_APP_IS_READY';
const PRODUCTION_APP_ORIGINS = new Set(['https://lunidex.app', 'https://www.lunidex.app']);
const LOCAL_APP_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);
const RESERVED_OTHER_APP_REF = 'pimauymeakxbvxdangbx';

function fail(message) {
  throw new Error(message);
}

function requireEnv(name, env) {
  const value = env[name]?.trim();
  if (!value) fail(`Required staging smoke variable ${name} is not set.`);
  return value;
}

function sharedPoolerRef(databaseUrl) {
  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username);
  const pooled = /^postgres\.([a-z0-9-]+)$/i.exec(user);
  if (pooled && /^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(url.hostname) && url.port === '5432') return pooled[1];
  return null;
}

export function validateStagingSmokeConfig(env) {
  if (env.LUNIDEX_STAGING_SMOKE !== REQUIRED_OPT_IN) {
    fail(`Set LUNIDEX_STAGING_SMOKE=${REQUIRED_OPT_IN} only when intentionally running this destructive test-account smoke against the dedicated staging project.`);
  }
  const stagingRef = requireEnv('LUNIDEX_STAGING_PROJECT_REF', env);
  if (!/^[a-z0-9-]+$/i.test(stagingRef)
    || stagingRef === 'local'
    || stagingRef === RESERVED_OTHER_APP_REF
    || env.SUPABASE_PROJECT_REF !== stagingRef) {
    fail('SUPABASE_PROJECT_REF must exactly match the generated LUNIDEX_STAGING_PROJECT_REF from the approved staging config.');
  }
  const api = new URL(requireEnv('SUPABASE_URL', env));
  if (api.protocol !== 'https:' || api.hostname !== `${stagingRef}.supabase.co`
    || api.port || api.pathname !== '/' || api.search || api.hash || api.username || api.password) {
    fail('SUPABASE_URL hostname must exactly match LUNIDEX_STAGING_PROJECT_REF.supabase.co over HTTPS.');
  }
  const app = new URL(requireEnv('LUNIDEX_STAGING_APP_URL', env));
  const isAllowedLocalOrigin = LOCAL_APP_ORIGINS.has(app.origin);
  const isAllowedHostedOrigin = app.protocol === 'https:'
    && app.hostname.endsWith('.lunidex.app')
    && !app.port
    && !PRODUCTION_APP_ORIGINS.has(app.origin);
  if ((!isAllowedLocalOrigin && !isAllowedHostedOrigin)
    || app.pathname !== '/' || app.search || app.hash || app.username || app.password) {
    fail('LUNIDEX_STAGING_APP_URL must be an exact loopback origin on port 3000 or an explicit HTTPS staging subdomain, without credentials, path, query, or fragment.');
  }
  const databaseUrl = requireEnv('SUPABASE_DATABASE_URL', env);
  const database = new URL(databaseUrl);
  if (sharedPoolerRef(databaseUrl) !== stagingRef
    || !['postgres:', 'postgresql:'].includes(database.protocol)
    || database.pathname !== '/postgres') {
    fail('SUPABASE_DATABASE_URL must use the staging Shared Pooler session endpoint on port 5432 with the matching postgres.<ref> user.');
  }
  if (env.LUNIDEX_STAGING_APP_API_CHECK
    && env.LUNIDEX_STAGING_APP_API_CHECK !== APP_API_OPT_IN) {
    fail(`LUNIDEX_STAGING_APP_API_CHECK must be ${APP_API_OPT_IN} or unset.`);
  }
  return {
    projectRef: stagingRef,
    apiUrl: api.origin,
    appOrigin: app.origin,
    databaseUrl,
    checkAppApi: env.LUNIDEX_STAGING_APP_API_CHECK === APP_API_OPT_IN,
    publishableKey: requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', env),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY', env),
  };
}

export async function withDatabaseTransaction(pool, operation) {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('begin');
    transactionOpen = true;
    const result = await operation(client);
    await client.query('commit');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function randomPassword() {
  return `${randomBytes(32).toString('base64url')}aA1!`;
}

function assertNoError(result, label) {
  if (result.error) fail(`${label} failed; the staging smoke stopped. Inspect the redacted staging logs and Auth configuration.`);
  return result.data;
}

async function expectDenied(request, label) {
  const { error } = await request;
  if (!error) fail(`${label} unexpectedly succeeded for an anonymous Data API request.`);
}

async function run() {
  const config = validateStagingSmokeConfig(process.env);
  const admin = createClient(config.apiUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const anonymous = createClient(config.apiUrl, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 1,
    ssl: { rejectUnauthorized: true },
    application_name: 'lunidex-staging-smoke',
  });
  const created = [];
  let primaryError = null;

  try {
    const runtimeClient = await pool.connect();
    try {
      const sslState = await runtimeClient.query(`
        select ssl, version, cipher
        from pg_catalog.pg_stat_ssl
        where pid = pg_backend_pid()
      `);
      if (sslState.rows.length !== 1 || sslState.rows[0].ssl !== true
        || !sslState.rows[0].version || !sslState.rows[0].cipher) {
        fail('The staging runtime pool connection did not report verified TLS state.');
      }
      const firstPid = await runtimeClient.query('select pg_backend_pid() as pid');
      const secondPid = await runtimeClient.query('select pg_backend_pid() as pid');
      if (firstPid.rows[0]?.pid !== secondPid.rows[0]?.pid) {
        fail('The staging runtime pooler did not preserve its PostgreSQL backend session.');
      }
    } finally {
      runtimeClient.release();
    }

    for (const label of ['a', 'b']) {
      const email = `lunidex-staging-smoke+${randomUUID()}-${label}@example.com`;
      const password = randomPassword();
      const collectionKey = `tcg2:en:base${label === 'a' ? '1' : '2'}`;
      const collectionCard = `${collectionKey}|base${label === 'a' ? '1' : '2'}-001|normal|1`;
      const user = assertNoError(await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: `Synthetic staging smoke ${label}` },
      }), `Staging Auth account ${label}`);
      if (!user.user?.id) fail(`Staging Auth did not return synthetic account ${label}.`);
      created.push({ id: user.user.id, email, password, label, collectionKey, collectionCard });
    }

    await withDatabaseTransaction(pool, async (seedClient) => {
      for (const account of created) {
        await seedClient.query('insert into app.users (id) values ($1::uuid)', [account.id]);
        await seedClient.query(`
          insert into public.profiles (id, name, email, is_public)
          values ($1::uuid, $2, $3, true)
        `, [account.id, `Synthetic staging smoke ${account.label}`, account.email]);
        await seedClient.query(`
          insert into public.user_state (user_id, data)
          values ($1::uuid, $2::jsonb)
        `, [account.id, JSON.stringify({
          migration_smoke: account.label,
          tcgCollectionModelVersion: 3,
          tcgCollections: [account.collectionKey],
          tcgCollectionCards: [account.collectionCard],
          tcgActiveCollections: [account.collectionKey],
        })]);
      }
    });

    const sessions = [];
    for (const account of created) {
      const client = createClient(config.apiUrl, config.publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const signIn = assertNoError(await client.auth.signInWithPassword({ email: account.email, password: account.password }), `Staging login ${account.label}`);
      if (signIn.user.id !== account.id || !signIn.session?.access_token) {
        fail(`Staging login ${account.label} resolved to an unexpected account or did not return an access token.`);
      }
      sessions.push({ account, client, accessToken: signIn.session.access_token });
    }

    for (const [index, session] of sessions.entries()) {
      const other = sessions[1 - index].account;
      const ownRows = assertNoError(await session.client.from('user_state').select('user_id,data'), `Owner read ${session.account.label}`);
      if (ownRows.length !== 1 || ownRows[0].user_id !== session.account.id
        || ownRows[0].data?.tcgCollections?.[0] !== session.account.collectionKey
        || ownRows[0].data?.tcgCollectionCards?.[0] !== session.account.collectionCard) {
        fail(`The authenticated user ${session.account.label} could not read exactly its own state row.`);
      }
      const crossRows = assertNoError(
        await session.client.from('user_state').select('user_id,data').eq('user_id', other.id),
        `Cross-account read ${session.account.label}`,
      );
      if (crossRows.length !== 0) fail(`Account ${session.account.label} could read another synthetic account's state.`);
    }

    if (config.checkAppApi) {
      const readAppSnapshot = async (session, requestedUserId) => {
        const url = new URL('/api/user-state', config.appOrigin);
        if (requestedUserId) url.searchParams.set('userId', requestedUserId);
        const response = await fetch(url, {
          headers: { authorization: `Bearer ${session.accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) fail(`The configured staging /api/user-state route returned HTTP ${response.status}.`);
        return response.json();
      };
      const [sessionA, sessionB] = sessions;
      const [initialA, initialB] = await Promise.all([
        readAppSnapshot(sessionA, sessionB.account.id),
        readAppSnapshot(sessionB, sessionA.account.id),
      ]);
      if (initialA?.data?.tcgCollections?.[0] !== sessionA.account.collectionKey
        || initialB?.data?.tcgCollections?.[0] !== sessionB.account.collectionKey) {
        fail('The app API did not return each bearer its own synthetic collection snapshot.');
      }

      const addedCollection = 'tcg2:en:base3';
      const addedCard = `${addedCollection}|base3-001|holo|1`;
      const updatedA = {
        ...initialA.data,
        tcgCollections: [...initialA.data.tcgCollections, addedCollection],
        tcgCollectionCards: [...initialA.data.tcgCollectionCards, addedCard],
        tcgActiveCollections: [...initialA.data.tcgActiveCollections, addedCollection],
      };
      const putResponse = await fetch(new URL('/api/user-state', config.appOrigin), {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${sessionA.accessToken}`,
          origin: config.appOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: updatedA, expectedUpdatedAt: initialA.updatedAt }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!putResponse.ok) fail(`The configured staging /api/user-state collection write returned HTTP ${putResponse.status}.`);
      const writtenA = await putResponse.json();
      if (writtenA?.data?.tcgCollections?.at(-1) !== addedCollection
        || writtenA.data.tcgCollectionCards?.at(-1) !== addedCard) {
        fail('The app API did not preserve the synthetic TCG collection write.');
      }

      const [afterA, afterB] = await Promise.all([
        readAppSnapshot(sessionA, sessionB.account.id),
        readAppSnapshot(sessionB, sessionA.account.id),
      ]);
      if (afterA?.data?.tcgCollections?.at(-1) !== addedCollection
        || afterA.data.tcgCollectionCards?.at(-1) !== addedCard) {
        fail('Account A could not read its own new collection after the app API write.');
      }
      if (JSON.stringify(afterB?.data) !== JSON.stringify(initialB?.data)
        || afterB?.data?.tcgCollections?.includes(addedCollection)) {
        fail('Account B state changed or exposed account A collection after the app API write.');
      }
    }

    const publicRows = assertNoError(
      await anonymous.from('public_profiles').select('id,name').eq('id', created[0].id),
      'Anonymous public profile read',
    );
    if (publicRows.length !== 1 || publicRows[0].id !== created[0].id) fail('The allowlisted public profile projection was not readable.');
    await expectDenied(anonymous.from('profiles').select('email').eq('id', created[0].id), 'Private profile email');
    await expectDenied(anonymous.from('api_keys').select('id').limit(1), 'API key table');
    await expectDenied(anonymous.schema('analytics').from('daily_metrics').select('*').limit(1), 'Analytics metrics');

    const callbackUrl = new URL('/fr/auth/callback', config.appOrigin);
    callbackUrl.searchParams.set('next', '/fr/auth/reset-password?mode=recovery');
    const recovery = assertNoError(await admin.auth.admin.generateLink({
      type: 'recovery',
      email: created[0].email,
      options: { redirectTo: callbackUrl.toString() },
    }), 'Staging recovery-link generation');
    if (recovery.properties.redirect_to !== callbackUrl.toString()) {
      fail('Supabase did not preserve the configured staging recovery callback URL.');
    }
    const recoveryClient = createClient(config.apiUrl, config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    assertNoError(await recoveryClient.auth.verifyOtp({ token_hash: recovery.properties.hashed_token, type: 'recovery' }), 'Synthetic recovery token verification');
    const changedPassword = randomPassword();
    assertNoError(await recoveryClient.auth.updateUser({ password: changedPassword }), 'Synthetic recovery password update');
    const relogin = assertNoError(await recoveryClient.auth.signInWithPassword({ email: created[0].email, password: changedPassword }), 'Login after synthetic password reset');
    if (relogin.user.id !== created[0].id) fail('The password-reset login resolved to an unexpected account ID.');

  } catch (error) {
    primaryError = error;
  }

  const cleanupErrors = [];
  const cleanupWarnings = [];
  const createdIds = created.map((account) => account.id);
  if (createdIds.length > 0) {
    try {
      const deleted = await pool.query('delete from app.users where id = any($1::uuid[]) returning id', [createdIds]);
      if (deleted.rowCount === null) cleanupErrors.push('The application projection delete returned no row count.');
    } catch {
      cleanupErrors.push('Could not delete the synthetic application account projections.');
    }
    try {
      const { rows } = await pool.query(`
        select
          exists(select 1 from app.users where id = any($1::uuid[])) as users_remain,
          exists(select 1 from public.profiles where id = any($1::uuid[])) as profiles_remain,
          exists(select 1 from public.user_state where user_id = any($1::uuid[])) as state_remains
      `, [createdIds]);
      if (rows[0]?.users_remain || rows[0]?.profiles_remain || rows[0]?.state_remains) {
        cleanupErrors.push('Synthetic app.users, profiles, or user_state rows remain after cleanup.');
      }
    } catch {
      cleanupErrors.push('Could not confirm removal of the synthetic application rows.');
    }
  }

  for (const account of created) {
    let deleteApiFailed = false;
    try {
      const deletion = await admin.auth.admin.deleteUser(account.id);
      if (deletion.error || deletion.data?.user?.id !== account.id) {
        deleteApiFailed = true;
      }
    } catch {
      deleteApiFailed = true;
    }
    try {
      const { rows } = await pool.query('select exists(select 1 from auth.users where id = $1::uuid) as user_remains', [account.id]);
      if (rows[0]?.user_remains) cleanupErrors.push(`Synthetic Auth account ${account.label} remains after cleanup.`);
      else if (deleteApiFailed) cleanupWarnings.push(`Auth deletion for account ${account.label} returned an error, but the database confirms that the account is absent.`);
    } catch {
      cleanupErrors.push(`Could not confirm removal of synthetic Auth account ${account.label}.`);
    }
  }
  try {
    await pool.end();
  } catch {
    cleanupErrors.push('Could not close the staging smoke database pool cleanly.');
  }

  if (primaryError && cleanupErrors.length > 0) {
    const reason = primaryError instanceof Error ? primaryError.message : 'Staging smoke failed.';
    fail(`${reason} Cleanup is incomplete or could not be confirmed: ${cleanupErrors.join(' ')}`);
  }
  if (primaryError) throw primaryError;
  if (cleanupErrors.length > 0) fail(`Staging smoke cleanup is incomplete or could not be confirmed: ${cleanupErrors.join(' ')}`);
  for (const warning of cleanupWarnings) console.warn(warning);
  console.log(`Staging smoke passed for two synthetic accounts on configured ref ${config.projectRef}: password login/reset API, callback allowlist, user_state owner isolation, private-column denial, and public-profile access.`);
  if (!config.checkAppApi) console.log('The app /api/user-state collection-ownership check was not run; configure LUNIDEX_STAGING_APP_API_CHECK only after its deployment uses this same staging project.');
  console.log('This smoke does not test public signup delivery, browser PKCE callback exchange, real OAuth, or SMTP delivery; those require the separate staging mailbox/browser checklist.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Staging smoke failed.');
    process.exitCode = 1;
  });
}
