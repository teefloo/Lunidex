#!/usr/bin/env node

import { mkdtemp, readdir, readFile, rm, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const FIXTURE_DATABASE = 'lunidex_neon_fixture';
const FIXTURE_USER_ID = 'ce8e7fe2-f0c8-4bd3-a154-a44f32fc93cf';
const FIXTURE_EMAIL = 'migration-fixture@lunidex.invalid';
const MIGRATION_DIR = path.resolve('neon/migrations');

function fail(message) {
  throw new Error(message);
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export function validateLocalFixtureTarget({ projectRef, apiUrl, databaseUrl }) {
  if (projectRef !== 'local') fail('The synthetic migration fixture only accepts SUPABASE_PROJECT_REF=local.');
  let api;
  let database;
  try {
    api = new URL(apiUrl);
    database = new URL(databaseUrl);
  } catch {
    fail('The local Supabase API or database URL is invalid.');
  }
  if (api.protocol !== 'http:' || !isLoopback(api.hostname) || api.port !== '54321') {
    fail('The synthetic migration fixture requires the local Supabase API on loopback port 54321.');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)
    || !isLoopback(database.hostname)
    || database.port !== '54322'
    || database.pathname !== '/postgres') {
    fail('The synthetic migration fixture requires the local Supabase database on loopback port 54322 and database postgres.');
  }
  return { apiUrl: api.origin, databaseUrl: database.toString() };
}

export function parseLocalSupabaseStatusEnv(output) {
  const parsed = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^(?:export\s+)?(API_URL|DB_URL|SERVICE_ROLE_KEY)=(.*)$/.exec(line.trim());
    if (!match) continue;
    let value = match[2];
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        fail('Supabase local status returned malformed environment output.');
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (typeof value !== 'string' || value.length === 0) continue;
    parsed[match[1]] = value;
  }
  if (!parsed.API_URL || !parsed.DB_URL || !parsed.SERVICE_ROLE_KEY) {
    fail('Supabase local status did not provide the local API, database URL, and service-role key.');
  }
  return parsed;
}

function readLocalSupabaseStatusEnv() {
  const result = spawnSync('npx', ['--yes', 'supabase@3.4.0', 'status', '--output', 'env'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    fail('The pinned Supabase CLI could not read the local stack status; CLI output was suppressed.');
  }
  return parseLocalSupabaseStatusEnv(result.stdout);
}

function fixtureDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  url.pathname = `/${FIXTURE_DATABASE}`;
  return url.toString();
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function prepareSyntheticSource(databaseUrl) {
  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = '/postgres';
  const adminPool = new Pool({ connectionString: maintenanceUrl.toString(), max: 1, ssl: false });
  try {
    const { rows } = await adminPool.query('select 1 from pg_catalog.pg_database where datname = $1', [FIXTURE_DATABASE]);
    if (rows.length !== 0) fail(`Local fixture database ${FIXTURE_DATABASE} already exists; stop and recreate only the local Supabase stack before retrying.`);
    await adminPool.query(`create database ${quoteIdentifier(FIXTURE_DATABASE)}`);
  } finally {
    await adminPool.end();
  }

  const sourcePool = new Pool({ connectionString: fixtureDatabaseUrl(databaseUrl), max: 1, ssl: false });
  try {
    const migrationFiles = (await readdir(MIGRATION_DIR))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();
    if (migrationFiles.length !== 10) fail(`Expected the reviewed ten Neon schema migrations; found ${migrationFiles.length}.`);
    for (const file of migrationFiles) {
      await sourcePool.query(await readFile(path.join(MIGRATION_DIR, file), 'utf8'));
    }
    await sourcePool.query(`
      create schema neon_auth;
      create table neon_auth."user" (
        id text primary key,
        email text not null unique,
        "emailVerified" boolean not null,
        name text
      )
    `);
    await sourcePool.query(`
      insert into neon_auth."user" (id, email, "emailVerified", name)
      values ($1, $2, true, 'Synthetic migration account')
    `, [FIXTURE_USER_ID, FIXTURE_EMAIL]);
    await sourcePool.query('insert into app.users (id) values ($1::uuid)', [FIXTURE_USER_ID]);
    await sourcePool.query(`
      insert into public.quiz_scores (user_id, pseudo, mode, challenge, score, date)
      values ($1::uuid, 'Synthetic migration account', 'marathon', 'classic', 17, date '2026-10-01')
    `, [FIXTURE_USER_ID]);
  } finally {
    await sourcePool.end();
  }
}

function runMigration(command, args = []) {
  const result = spawnSync('npm', ['run', `db:migrate:supabase:${command}`, ...(args.length ? ['--', ...args] : [])], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) fail(`Could not run the local migration ${command} command.`);
  if (result.status !== 0) fail(`Local migration ${command} exited with status ${result.status ?? 'unknown'}.`);
}

async function run() {
  const localEnv = readLocalSupabaseStatusEnv();
  const target = validateLocalFixtureTarget({
    projectRef: 'local',
    apiUrl: localEnv.API_URL,
    databaseUrl: localEnv.DB_URL,
  });

  const exportDir = await mkdtemp(path.join(os.tmpdir(), 'lunidex-neon-supabase-fixture-'));
  await chmod(exportDir, 0o700);
  process.env.SUPABASE_URL = target.apiUrl;
  process.env.SUPABASE_PROJECT_REF = 'local';
  process.env.SUPABASE_MIGRATION_DATABASE_URL = target.databaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = localEnv.SERVICE_ROLE_KEY;
  process.env.NEON_SOURCE_DATABASE_URL = fixtureDatabaseUrl(target.databaseUrl);
  process.env.LUNIDEX_MIGRATION_EXPORT_DIR = exportDir;
  process.env.LUNIDEX_MIGRATION_WRITE_FREEZE = 'I_HAVE_FROZEN_WRITES';

  try {
    await prepareSyntheticSource(target.databaseUrl);
    runMigration('export', ['--final']);
    runMigration('dry-run');
    runMigration('auth');
    runMigration('data');
    runMigration('verify');
    // Replaying the exact digest proves the guarded import path is idempotent.
    runMigration('auth');
    runMigration('data');
    runMigration('verify');
    console.log('Synthetic Neon-to-Supabase local rehearsal passed with one fake Auth identity and one application row.');
  } finally {
    await rm(exportDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Synthetic migration fixture failed.');
    process.exitCode = 1;
  });
}

export const localFixtureTestValues = { FIXTURE_DATABASE, FIXTURE_EMAIL, FIXTURE_USER_ID };
