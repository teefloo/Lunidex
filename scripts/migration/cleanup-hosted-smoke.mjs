#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { requireSupabaseAdminKey } from './supabase-admin-key.mjs';
import {
  isSyntheticSmokeUser,
  LUNIDEX_PROJECT_REF,
  SYNTHETIC_SMOKE_EMAIL_PATTERN,
  SYNTHETIC_SMOKE_METADATA_KEY,
  SYNTHETIC_SMOKE_TAG,
} from './hosted-smoke-constants.mjs';

export const CLEANUP_OPT_IN = 'I_CONFIRM_DELETE_LUNIDEX_SYNTHETIC_SMOKE_USERS';

function fail(message) {
  throw new Error(message);
}

function required(env, key) {
  const value = env[key]?.trim();
  if (!value) fail(`Required cleanup variable ${key} is not set.`);
  return value;
}

function sharedPoolerRef(url) {
  let username;
  try {
    username = decodeURIComponent(url.username);
  } catch {
    return null;
  }
  const match = /^postgres\.([a-z0-9-]+)$/i.exec(username);
  if (match && /^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(url.hostname)
    && url.port === '5432') return match[1];
  return null;
}

function hasVerifiedTlsConnectionStringOptions(database) {
  const parameters = [...database.searchParams.entries()];
  return parameters.length === 0
    || (parameters.length === 1
      && parameters[0][0].toLowerCase() === 'sslmode'
      && parameters[0][1].toLowerCase() === 'verify-full');
}

export function validateHostedCleanupConfig(env) {
  if (env.LUNIDEX_HOSTED_SMOKE_CLEANUP !== CLEANUP_OPT_IN) {
    fail(`Set LUNIDEX_HOSTED_SMOKE_CLEANUP=${CLEANUP_OPT_IN} only when intentionally removing marked synthetic Lunidex smoke accounts.`);
  }

  const projectRef = required(env, 'SUPABASE_PROJECT_REF');
  if (projectRef !== LUNIDEX_PROJECT_REF) {
    fail('SUPABASE_PROJECT_REF must exactly match the fixed Lunidex project ref.');
  }

  let apiUrl;
  try {
    apiUrl = new URL(required(env, 'SUPABASE_URL'));
  } catch {
    fail('SUPABASE_URL is not a valid URL.');
  }
  if (apiUrl.protocol !== 'https:' || apiUrl.hostname !== `${LUNIDEX_PROJECT_REF}.supabase.co`
    || apiUrl.port || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash
    || apiUrl.username || apiUrl.password) {
    fail('SUPABASE_URL must exactly match the fixed Lunidex project API over HTTPS.');
  }

  const databaseUrl = required(env, 'SUPABASE_DATABASE_URL');
  let database;
  try {
    database = new URL(databaseUrl);
  } catch {
    fail('SUPABASE_DATABASE_URL is not a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)
    || sharedPoolerRef(database) !== LUNIDEX_PROJECT_REF
    || database.pathname !== '/postgres' || !database.password
    || database.hash || !hasVerifiedTlsConnectionStringOptions(database)) {
    fail('SUPABASE_DATABASE_URL must use the fixed Lunidex Shared Pooler session endpoint on port 5432.');
  }

  return {
    projectRef,
    apiUrl: apiUrl.origin,
    databaseUrl,
    adminKey: requireSupabaseAdminKey(env),
  };
}

async function listAllUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error || !Array.isArray(result.data?.users)) {
      fail('Could not enumerate Auth users; no cleanup was attempted.');
    }
    users.push(...result.data.users);
    if (result.data.users.length < 1000) return users;
  }
}

async function verifyRowsAbsent(client, userIds) {
  const { rows } = await client.query(`
    select
      exists(select 1 from auth.users where id = any($1::uuid[])) as auth_users_remain,
      exists(select 1 from app.users where id = any($1::uuid[])) as app_users_remain,
      exists(select 1 from public.profiles where id = any($1::uuid[])) as profiles_remain,
      exists(select 1 from public.user_state where user_id = any($1::uuid[])) as user_state_remains
  `, [userIds]);
  const state = rows[0];
  if (!state || state.auth_users_remain || state.app_users_remain
    || state.profiles_remain || state.user_state_remains) {
    fail('Cleanup did not verify absence of the marked accounts in Auth and application projections.');
  }
}

export async function cleanupSyntheticSmokeAccounts({ admin, pool }) {
  const allUsers = await listAllUsers(admin);
  const candidates = allUsers.filter(isSyntheticSmokeUser);
  for (const user of candidates) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id ?? '')) {
      fail('A marked synthetic Auth user had an invalid UUID; cleanup stopped before any deletion.');
    }
  }

  // Recover projections left by an interrupted cleanup only when both the
  // reserved synthetic email and a schema-level marker are present.
  const orphanResult = await pool.query(`
    select distinct
      coalesce(profiles.id, user_state.user_id)::text as id,
      profiles.email,
      profiles.name,
      user_state.data ->> $2 as state_marker
    from public.profiles
    full join public.user_state on user_state.user_id = profiles.id
    where profiles.name like $1
      or user_state.data ->> $2 = $3
  `, [`%${SYNTHETIC_SMOKE_TAG}%`, SYNTHETIC_SMOKE_METADATA_KEY, SYNTHETIC_SMOKE_TAG]);
  const liveAuthById = new Map(allUsers.map((user) => [user.id, user]));
  const orphanIds = [];
  for (const row of orphanResult.rows) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id ?? '')) {
      fail('A marked synthetic projection had an invalid UUID; cleanup stopped before any deletion.');
    }
    if (!SYNTHETIC_SMOKE_EMAIL_PATTERN.test(row.email ?? '')) {
      fail('A synthetic projection marker lacked its reserved Lunidex smoke address; cleanup stopped before any deletion.');
    }
    const liveUser = liveAuthById.get(row.id);
    if (liveUser && !isSyntheticSmokeUser(liveUser)) {
      fail('A reserved-email projection marker belongs to an unmarked Auth user; cleanup stopped before any deletion.');
    }
    if (!liveUser) orphanIds.push(row.id);
  }
  const authIds = candidates.map((user) => user.id);
  const ids = [...new Set([...authIds, ...orphanIds])];
  if (ids.length === 0) return { deletedCount: 0 };

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('begin');
    transactionOpen = true;
    // app.users owns the projections and cascades only the rows for these marked UUIDs.
    await client.query('delete from app.users where id = any($1::uuid[])', [ids]);
    const { rows } = await client.query(`
      select
        exists(select 1 from app.users where id = any($1::uuid[])) as app_users_remain,
        exists(select 1 from public.profiles where id = any($1::uuid[])) as profiles_remain,
        exists(select 1 from public.user_state where user_id = any($1::uuid[])) as user_state_remains
    `, [ids]);
    if (!rows[0] || rows[0].app_users_remain || rows[0].profiles_remain || rows[0].user_state_remains) {
      fail('Synthetic application rows remain; Auth accounts were retained for a recoverable retry.');
    }
    await client.query('commit');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  for (const user of candidates) {
    const result = await admin.auth.admin.deleteUser(user.id);
    if (result.error) fail('A marked synthetic Auth account could not be deleted; rerun cleanup to recover.');
  }

  const remaining = (await listAllUsers(admin)).filter((user) => authIds.includes(user.id) || isSyntheticSmokeUser(user));
  if (remaining.length > 0) {
    fail('Marked synthetic Auth users remain after deletion; rerun cleanup to recover.');
  }

  const verificationClient = await pool.connect();
  try {
    await verifyRowsAbsent(verificationClient, ids);
  } finally {
    verificationClient.release();
  }
  const markedRowsRemain = await pool.query(`
    select exists(
      select 1
      from public.profiles
      full join public.user_state on user_state.user_id = profiles.id
      where profiles.name like $1
        or user_state.data ->> $2 = $3
    ) as marked_projection_remains
  `, [`%${SYNTHETIC_SMOKE_TAG}%`, SYNTHETIC_SMOKE_METADATA_KEY, SYNTHETIC_SMOKE_TAG]);
  if (markedRowsRemain.rows[0]?.marked_projection_remains) {
    fail('Synthetic profile/state markers remain outside the verified cleanup UUID set.');
  }

  return { deletedCount: candidates.length };
}

async function run() {
  const config = validateHostedCleanupConfig(process.env);
  const admin = createClient(config.apiUrl, config.adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 1,
    ssl: { rejectUnauthorized: true },
    application_name: 'lunidex-hosted-smoke-cleanup',
  });
  let primaryError = null;
  try {
    const result = await cleanupSyntheticSmokeAccounts({ admin, pool });
    console.log(`Hosted smoke cleanup verified zero remaining marked synthetic accounts on fixed Lunidex ref ${config.projectRef}; deleted ${result.deletedCount}.`);
  } catch (error) {
    primaryError = error;
  }
  try {
    await pool.end();
  } catch {
    if (!primaryError) primaryError = new Error('Could not close the cleanup database pool cleanly.');
  }
  if (primaryError) throw primaryError;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Hosted smoke cleanup failed.');
    process.exitCode = 1;
  });
}
