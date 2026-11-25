#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAdminKey } from './supabase-admin-key.mjs';

const EXPECTED_TABLES = [
  'app.users',
  'public.user_state',
  'public.profiles',
  'public.quiz_scores',
  'public.quiz_attempts',
  'public.battle_rooms',
  'public.tcg_price_history',
  'public.tcg_price_alerts',
  'public.user_push_subscriptions',
  'public.friend_directory',
  'public.friendships',
  'public.friend_collection_snapshots',
  'public.friend_deck_snapshots',
  'analytics.daily_metrics',
  'public.tcg_sealed_products',
  'public.tcg_sealed_price_snapshots',
  'public.tcg_sealed_sync_runs',
  'public.tcg_sealed_settings',
  'public.tcg_sealed_transactions',
  'public.tcg_sealed_user_revisions',
  'public.tcg_sealed_allocations',
  'public.tcg_sealed_aliases',
  'public.tcg_sealed_audit',
  'public.tcg_sealed_portfolio_daily',
  'public.api_keys',
  'public.api_quota_buckets',
  'public.api_usage_daily',
  'public.api_idempotency',
  'public.tcg_price_history_qualified',
  'public.tcg_price_history_refresh_targets',
  'public.tcg_collection_shares',
];

const EXPORT_DIR = path.resolve(process.env.LUNIDEX_MIGRATION_EXPORT_DIR ?? '.migration/neon-to-supabase');
const MANIFEST_PATH = path.join(EXPORT_DIR, 'manifest.json');
const DATA_PATH = path.join(EXPORT_DIR, 'application-data.jsonl');
const USERS_PATH = path.join(EXPORT_DIR, 'auth-users.json');
const CURSOR_BATCH_SIZE = 500;
const IMPORT_BATCH_MAX_ROWS = 500;
const IMPORT_BATCH_MAX_BYTES = 8 * 1024 * 1024;
const LOCK_KEY = 'lunidex-neon-to-supabase-v1';

class MigrationError extends Error {}

function fail(message) {
  throw new MigrationError(message);
}

function requiredEnv(name, env = process.env) {
  const value = env[name]?.trim();
  if (!value) fail(`Required environment variable ${name} is not set.`);
  return value;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function qualifiedName(schema, table) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

function parseProjectRef(value, env = process.env) {
  const parsed = new URL(value);
  const directHost = /^db\.([a-z0-9-]+)\.supabase\.co$/i.exec(parsed.hostname);
  if (directHost) return directHost[1];
  const username = decodeURIComponent(parsed.username);
  const poolerUser = /^postgres\.([a-z0-9-]+)$/i.exec(username);
  if (poolerUser && parsed.hostname.endsWith('.pooler.supabase.com')) return poolerUser[1];
  if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1')
    && env.SUPABASE_PROJECT_REF === 'local') return 'local';
  return null;
}

function validateTarget(env = process.env) {
  const projectRef = requiredEnv('SUPABASE_PROJECT_REF', env);
  const publicUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicUrl) fail('Set SUPABASE_URL to the intended migration project URL.');
  const url = new URL(publicUrl);
  const publicRef = url.hostname.endsWith('.supabase.co')
    ? url.hostname.split('.')[0]
    : url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? 'local' : null;
  if (publicRef !== projectRef) fail('SUPABASE_PROJECT_REF does not match the configured Supabase API URL.');

  const databaseUrl = requiredEnv('SUPABASE_MIGRATION_DATABASE_URL', env);
  if (parseProjectRef(databaseUrl, env) !== projectRef) {
    fail('Could not confirm that SUPABASE_MIGRATION_DATABASE_URL belongs to SUPABASE_PROJECT_REF; use a direct project connection or the documented session pooler URL.');
  }
  return { projectRef, databaseUrl, publicUrl: url.origin };
}

function createPool(connectionString, applicationName) {
  const isLocal = new URL(connectionString).hostname === 'localhost'
    || new URL(connectionString).hostname === '127.0.0.1'
    || new URL(connectionString).hostname === '::1';
  return new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    ssl: isLocal ? false : true,
    application_name: applicationName,
  });
}

function digestText(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function digestFile(filePath) {
  const hash = createHash('sha256');
  const input = (await import('node:fs')).createReadStream(filePath);
  for await (const chunk of input) hash.update(chunk);
  return hash.digest('hex');
}

function getExpectedTables(value) {
  return [...value].sort();
}

async function getTableInventory(client) {
  const { rows } = await client.query(`
    select schemaname as schema_name, tablename as table_name
    from pg_catalog.pg_tables
    where schemaname in ('app', 'public', 'analytics')
    order by schemaname, tablename
  `);
  return rows.map((row) => `${row.schema_name}.${row.table_name}`);
}

function assertExactInventory(actual, label) {
  const expected = getExpectedTables(EXPECTED_TABLES);
  const sortedActual = getExpectedTables(actual);
  if (JSON.stringify(sortedActual) !== JSON.stringify(expected)) {
    fail(`${label} application table inventory does not match this Lunidex schema revision. Expected ${expected.length} tables; found ${sortedActual.length}. No data was changed.`);
  }
}

async function getPrimaryKeys(client, tables) {
  const result = new Map();
  for (const name of tables) {
    const [schema, table] = name.split('.');
    const { rows } = await client.query(`
      select a.attname as column_name
      from pg_catalog.pg_constraint c
      cross join lateral unnest(c.conkey) with ordinality as key_column(attnum, position)
      join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = key_column.attnum
      where c.contype = 'p'
        and c.conrelid = to_regclass($1)
      order by key_column.position
    `, [`${schema}.${table}`]);
    result.set(name, rows.map((row) => row.column_name));
  }
  return result;
}

async function getForeignKeys(client) {
  const { rows } = await client.query(`
    select child_ns.nspname as child_schema,
           child.relname as child_table,
           constraint_row.conname as constraint_name,
           parent_ns.nspname as parent_schema,
           parent.relname as parent_table,
           pg_catalog.pg_get_constraintdef(constraint_row.oid, true) as definition
    from pg_catalog.pg_constraint constraint_row
    join pg_catalog.pg_class child on child.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_catalog.pg_class parent on parent.oid = constraint_row.confrelid
    join pg_catalog.pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    where constraint_row.contype = 'f'
      and child_ns.nspname in ('app', 'public', 'analytics')
    order by child_ns.nspname, child.relname, constraint_row.conname
  `);
  return rows.map((row) => ({
    child: `${row.child_schema}.${row.child_table}`,
    name: row.constraint_name,
    parent: `${row.parent_schema}.${row.parent_table}`,
    definition: row.definition,
  }));
}

async function getSchemaInventory(client) {
  const [columns, constraints, indexes, triggers, routines, views, extensions, sequence_definitions] = await Promise.all([
    client.query(`
      select table_schema as schema_name, table_name, ordinal_position,
             column_name, data_type, udt_schema, udt_name, is_nullable,
             column_default, is_identity, identity_generation,
             is_generated, generation_expression, collation_schema, collation_name
      from information_schema.columns
      where table_schema in ('app', 'public', 'analytics')
      order by table_schema, table_name, ordinal_position
    `),
    client.query(`
      select ns.nspname as schema_name, tbl.relname as table_name,
             constraint_row.conname as constraint_name,
             constraint_row.contype::text as constraint_type,
             pg_catalog.pg_get_constraintdef(constraint_row.oid, true) as definition,
             constraint_row.condeferrable as is_deferrable,
             constraint_row.condeferred as initially_deferred,
             constraint_row.convalidated as is_validated
      from pg_catalog.pg_constraint constraint_row
      join pg_catalog.pg_class tbl on tbl.oid = constraint_row.conrelid
      join pg_catalog.pg_namespace ns on ns.oid = tbl.relnamespace
      where ns.nspname in ('app', 'public', 'analytics')
        and constraint_row.contype in ('p', 'u', 'c')
      order by ns.nspname, tbl.relname, constraint_row.conname
    `),
    client.query(`
      select schemaname as schema_name, tablename as table_name,
             indexname as index_name, indexdef as definition
      from pg_catalog.pg_indexes
      where schemaname in ('app', 'public', 'analytics')
      order by schemaname, tablename, indexname
    `),
    client.query(`
      select ns.nspname as schema_name, tbl.relname as table_name,
             trigger_row.tgname as trigger_name,
             pg_catalog.pg_get_triggerdef(trigger_row.oid, true) as definition,
             pg_catalog.pg_get_function_identity_arguments(proc.oid) as function_arguments,
             proc.proname as function_name
      from pg_catalog.pg_trigger trigger_row
      join pg_catalog.pg_class tbl on tbl.oid = trigger_row.tgrelid
      join pg_catalog.pg_namespace ns on ns.oid = tbl.relnamespace
      join pg_catalog.pg_proc proc on proc.oid = trigger_row.tgfoid
      where ns.nspname in ('app', 'public', 'analytics')
        and not trigger_row.tgisinternal
      order by ns.nspname, tbl.relname, trigger_row.tgname
    `),
    client.query(`
      select ns.nspname as schema_name, proc.proname as routine_name,
             pg_catalog.pg_get_function_identity_arguments(proc.oid) as identity_arguments,
             proc.prokind::text as routine_kind,
             pg_catalog.pg_get_functiondef(proc.oid) as definition,
             proc.prosecdef as security_definer,
             proc.provolatile::text as volatility,
             proc.proconfig as configuration
      from pg_catalog.pg_proc proc
      join pg_catalog.pg_namespace ns on ns.oid = proc.pronamespace
      where ns.nspname in ('app', 'public', 'analytics')
        and proc.prokind in ('f', 'p', 'w')
        and not exists (
          select 1 from pg_catalog.pg_depend extension_dependency
          where extension_dependency.classid = 'pg_catalog.pg_proc'::regclass
            and extension_dependency.objid = proc.oid
            and extension_dependency.deptype = 'e'
        )
      order by ns.nspname, proc.proname, identity_arguments
    `),
    client.query(`
      select ns.nspname as schema_name, rel.relname as view_name,
             rel.relkind::text as view_kind,
             pg_catalog.pg_get_viewdef(rel.oid, true) as definition,
             rel.reloptions as options
      from pg_catalog.pg_class rel
      join pg_catalog.pg_namespace ns on ns.oid = rel.relnamespace
      where ns.nspname in ('app', 'public', 'analytics')
        and rel.relkind in ('v', 'm')
      order by ns.nspname, rel.relname
    `),
    client.query(`
      select ext.extname as extension_name, ext.extversion as version
      from pg_catalog.pg_extension ext
      where ext.extname = 'pgcrypto'
      order by ext.extname
    `),
    client.query(`
      select seq_ns.nspname as schema_name, seq.relname as sequence_name,
             pg_catalog.format_type(seq_data.seqtypid, null) as data_type,
             seq_data.seqstart as start_value,
             seq_data.seqincrement as increment_by,
             seq_data.seqmin as min_value,
             seq_data.seqmax as max_value,
             seq_data.seqcache as cache_size,
             seq_data.seqcycle as cycle,
             owner_ns.nspname as owner_schema,
             owner_table.relname as owner_table,
             owner_column.attname as owner_column
      from pg_catalog.pg_class seq
      join pg_catalog.pg_namespace seq_ns on seq_ns.oid = seq.relnamespace
      join pg_catalog.pg_sequence seq_data on seq_data.seqrelid = seq.oid
      left join pg_catalog.pg_depend ownership
        on ownership.classid = 'pg_catalog.pg_class'::regclass
        and ownership.objid = seq.oid
        and ownership.refclassid = 'pg_catalog.pg_class'::regclass
        and ownership.deptype in ('a', 'i')
      left join pg_catalog.pg_class owner_table on owner_table.oid = ownership.refobjid
      left join pg_catalog.pg_namespace owner_ns on owner_ns.oid = owner_table.relnamespace
      left join pg_catalog.pg_attribute owner_column
        on owner_column.attrelid = owner_table.oid
        and owner_column.attnum = ownership.refobjsubid
      where seq.relkind = 'S'
        and seq_ns.nspname in ('app', 'public', 'analytics')
      order by seq_ns.nspname, seq.relname
    `),
  ]);
  return {
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
    triggers: triggers.rows,
    routines: routines.rows,
    views: views.rows,
    extensions: extensions.rows,
    sequence_definitions: sequence_definitions.rows,
  };
}

function assertSchemaInventory(actual, expected, label) {
  let actualForComparison = actual;
  let expectedForComparison = expected;

  if (label === 'Supabase target') {
    const viewKey = (view) => `${view.schema_name}.${view.view_name}`;
    const normalizeOptions = (options) => Array.isArray(options) ? [...options].sort() : options;
    const sourceProfiles = expected.views.filter((view) => viewKey(view) === 'public.public_profiles');
    const targetProfiles = actual.views.filter((view) => viewKey(view) === 'public.public_profiles');
    if (sourceProfiles.length !== 1 || targetProfiles.length !== 1) {
      fail('The reviewed public.public_profiles view must exist exactly once in both source and Supabase schema inventories.');
    }

    const sourceOptions = normalizeOptions(sourceProfiles[0].options);
    const targetOptions = normalizeOptions(targetProfiles[0].options);
    if (!Array.isArray(sourceOptions)
      || !sourceOptions.includes('security_barrier=true')
      || sourceOptions.includes('security_invoker=true')) {
      fail('The source public.public_profiles view no longer matches the reviewed security_barrier-only baseline.');
    }
    const invokerOptions = targetOptions?.filter((option) => option === 'security_invoker=true') ?? [];
    if (invokerOptions.length !== 1) {
      fail('Supabase public.public_profiles must have exactly one security_invoker=true option.');
    }

    // The Supabase RLS migration intentionally strengthens the source view by
    // setting security_invoker. Strip only that verified option for digest
    // comparison; every other view option remains subject to exact comparison.
    actualForComparison = {
      ...actual,
      views: actual.views.map((view) => view === targetProfiles[0]
        ? { ...view, options: targetOptions.filter((option) => option !== 'security_invoker=true') }
        : { ...view, options: normalizeOptions(view.options) }),
    };
    expectedForComparison = {
      ...expected,
      views: expected.views.map((view) => ({ ...view, options: normalizeOptions(view.options) })),
    };
  }

  if (digestText(JSON.stringify(actualForComparison)) !== digestText(JSON.stringify(expectedForComparison))) {
    fail(`${label} columns, non-foreign-key constraints, indexes, triggers, routines, views, sequences, or pgcrypto extension differ from the source export.`);
  }
}

function buildBatchInsertQuery(table, writableColumns) {
  if (writableColumns.length === 0) fail(`Target table ${table} has no writable columns.`);
  const columnList = writableColumns.map(quoteIdentifier).join(', ');
  const mappedColumns = writableColumns.map((column) => `mapped.${quoteIdentifier(column)}`).join(', ');
  return `with mapped as (
    select * from jsonb_populate_recordset(NULL::${table}, $1::jsonb)
  ) insert into ${table} (${columnList})
    select ${mappedColumns} from mapped
    on conflict do nothing`;
}

function shouldFlushImportBatch(rowCount, byteCount, nextRowBytes) {
  return rowCount > 0 && (
    rowCount >= IMPORT_BATCH_MAX_ROWS
    || byteCount + nextRowBytes > IMPORT_BATCH_MAX_BYTES
  );
}

function buildExportManifest({ server_version_num, tables, foreign_keys, schema_inventory, sequences, auth_users, application_data_sha256, final_export }) {
  const authText = JSON.stringify(auth_users);
  const schemaText = JSON.stringify(schema_inventory);
  const source_digest = digestText([
    JSON.stringify(foreign_keys), schemaText, JSON.stringify(sequences), authText,
    tables.map((entry) => `${entry.schema}.${entry.table}:${entry.row_count}:${entry.rows_sha256}`).join('\n'),
  ].join('\n'));
  return {
    format_version: 2,
    created_at: new Date().toISOString(),
    source: { provider: 'neon', server_version_num },
    tables,
    foreign_keys,
    schema_inventory,
    sequences,
    auth_user_count: auth_users.length,
    auth_users_sha256: digestText(authText),
    application_data_sha256,
    source_digest,
    snapshot_is_final: final_export,
    writes_frozen: final_export,
    auth_passwords_exported: false,
    auth_sessions_exported: false,
  };
}

function decideTargetImportState({ source_digest, recorded_digests, non_empty_tables }) {
  if (recorded_digests.length > 0) {
    if (recorded_digests.length !== 1 || recorded_digests[0] !== source_digest) {
      fail('A different or ambiguous migration export was already applied to this target.');
    }
    return 'verify-existing';
  }
  if (non_empty_tables.length > 0) {
    fail(`Target table ${non_empty_tables[0]} is not empty; migration refuses an existing application dataset.`);
  }
  return 'import';
}

async function getOwnedSequences(client, tables) {
  const metadata = [];
  for (const name of tables) {
    const [schema, table] = name.split('.');
    const { rows } = await client.query(`
      select attr.attname as column_name,
             pg_catalog.pg_get_serial_sequence(format('%I.%I', ns.nspname, tbl.relname), attr.attname) as sequence_name
      from pg_catalog.pg_class tbl
      join pg_catalog.pg_namespace ns on ns.oid = tbl.relnamespace
      join pg_catalog.pg_attribute attr on attr.attrelid = tbl.oid and attr.attnum > 0 and not attr.attisdropped
      where ns.nspname = $1 and tbl.relname = $2
        and (attr.attidentity <> '' or attr.atthasdef)
      order by attr.attnum
    `, [schema, table]);
    for (const row of rows) {
      if (!row.sequence_name) continue;
      const { rows: values } = await client.query(
        'select pg_catalog.pg_sequence_last_value($1::regclass)::text as last_value',
        [row.sequence_name],
      );
      metadata.push({
        schema,
        table,
        column: row.column_name,
        last_value: values[0]?.last_value ?? null,
      });
    }
  }
  return metadata;
}

function dependencyOrder(tables, foreignKeys) {
  const dependencies = new Map(tables.map((table) => [table, new Set()]));
  for (const key of foreignKeys) {
    if (key.child !== key.parent && dependencies.has(key.child) && dependencies.has(key.parent)) {
      dependencies.get(key.child).add(key.parent);
    }
  }
  const remaining = new Set(tables);
  const result = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) => [...dependencies.get(table)].every((parent) => !remaining.has(parent)));
    if (ready.length === 0) fail('The application schema has a cyclic foreign-key dependency; export/import order cannot be proven safe.');
    ready.sort();
    for (const table of ready) {
      result.push(table);
      remaining.delete(table);
    }
  }
  return result;
}

async function rowChecksum(client, qualifiedTable, primaryKeys = []) {
  const orderBy = primaryKeys.length > 0
    ? primaryKeys.map(quoteIdentifier).join(', ')
    : 'to_jsonb(row_value)::text';
  await client.query('DECLARE lunidex_verify_cursor CURSOR FOR '
    + `SELECT to_jsonb(row_value)::text AS row_json FROM ${qualifiedTable} AS row_value ORDER BY ${orderBy}`);
  const hash = createHash('sha256');
  let count = 0;
  try {
    while (true) {
      const { rows } = await client.query(`FETCH FORWARD ${CURSOR_BATCH_SIZE} FROM lunidex_verify_cursor`);
      if (rows.length === 0) break;
      for (const row of rows) {
        hash.update(row.row_json);
        hash.update('\n');
        count += 1;
      }
    }
  } finally {
    await client.query('CLOSE lunidex_verify_cursor');
  }
  return { count, sha256: hash.digest('hex') };
}

async function exportAuthUsers(client) {
  const { rows: columns } = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'neon_auth' and table_name = 'user'
  `);
  const names = new Set(columns.map((row) => row.column_name));
  if (!names.has('id') || !names.has('email') || !names.has('emailVerified') || !names.has('name')) {
    fail('The Neon Auth user table shape is not the reviewed Better Auth layout; no Auth export was written. Inspect its schema and update the explicit field mapping before continuing.');
  }

  const { rows } = await client.query('select to_jsonb(auth_user)::text as user_json from neon_auth."user" as auth_user order by auth_user.id');
  const users = rows.map(({ user_json }) => {
    const source = JSON.parse(user_json);
    if (typeof source.id !== 'string' || typeof source.email !== 'string' || typeof source.emailVerified !== 'boolean') {
      fail('A Neon Auth user row has an unexpected identity shape; no Auth export was written.');
    }
    const name = typeof source.name === 'string' ? source.name.trim().slice(0, 120) : '';
    return {
      id: source.id,
      email: source.email.trim(),
      email_confirmed: source.emailVerified,
      user_metadata: name ? { name, display_name: name } : {},
    };
  });
  const seenIds = new Set();
  const seenEmails = new Set();
  for (const user of users) {
    const emailKey = user.email.toLowerCase();
    if (seenIds.has(user.id) || seenEmails.has(emailKey)) fail('The source Auth export contains duplicate IDs or emails; no import can proceed safely.');
    seenIds.add(user.id);
    seenEmails.add(emailKey);
  }
  return users;
}

async function exportCommand(finalExport = false) {
  if (finalExport) validateFreeze();
  const sourceUrl = requiredEnv('NEON_SOURCE_DATABASE_URL');
  await mkdir(EXPORT_DIR, { recursive: true, mode: 0o700 });
  await chmod(EXPORT_DIR, 0o700);
  const pool = createPool(sourceUrl, 'lunidex-neon-source-export');
  const client = await pool.connect();
  let dataOutput;
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    const tables = await getTableInventory(client);
    assertExactInventory(tables, 'Neon source');
    const foreignKeys = await getForeignKeys(client);
    const schemaInventory = await getSchemaInventory(client);
    const tableOrder = dependencyOrder(tables, foreignKeys);
    const primaryKeys = await getPrimaryKeys(client, tables);
    const sequences = await getOwnedSequences(client, tables);
    const authUsers = await exportAuthUsers(client);
    dataOutput = createWriteStream(DATA_PATH, { mode: 0o600 });
    const tableManifest = [];

    for (const name of tableOrder) {
      const [schema, table] = name.split('.');
      const qualified = qualifiedName(schema, table);
      const key = primaryKeys.get(name) ?? [];
      const orderBy = key.length > 0 ? key.map(quoteIdentifier).join(', ') : 'to_jsonb(row_value)::text';
      await client.query('DECLARE lunidex_export_cursor CURSOR FOR '
        + `SELECT to_jsonb(row_value)::text AS row_json FROM ${qualified} AS row_value ORDER BY ${orderBy}`);
      const hash = createHash('sha256');
      let rowCount = 0;
      try {
        while (true) {
          const { rows } = await client.query(`FETCH FORWARD ${CURSOR_BATCH_SIZE} FROM lunidex_export_cursor`);
          if (rows.length === 0) break;
          for (const row of rows) {
            const line = JSON.stringify({ schema, table, row_json: row.row_json });
            if (!dataOutput.write(`${line}\n`)) await once(dataOutput, 'drain');
            hash.update(row.row_json);
            hash.update('\n');
            rowCount += 1;
          }
        }
      } finally {
        await client.query('CLOSE lunidex_export_cursor');
      }
      tableManifest.push({ schema, table, primary_key: key, row_count: rowCount, rows_sha256: hash.digest('hex') });
    }
    dataOutput.end();
    await once(dataOutput, 'finish');
    await writeFile(USERS_PATH, `${JSON.stringify(authUsers, null, 2)}\n`, { mode: 0o600 });
    await chmod(DATA_PATH, 0o600);
    await chmod(USERS_PATH, 0o600);
    const { rows: versionRows } = await client.query('select current_setting(\'server_version_num\') as server_version_num');
    const manifest = buildExportManifest({
      server_version_num: versionRows[0]?.server_version_num ?? null,
      tables: tableManifest,
      foreign_keys: foreignKeys,
      schema_inventory: schemaInventory,
      sequences,
      auth_users: authUsers,
      application_data_sha256: await digestFile(DATA_PATH),
      final_export: finalExport,
    });
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await chmod(MANIFEST_PATH, 0o600);
    await client.query('ROLLBACK');
    console.log(`Repeatable-read Neon export complete${finalExport ? ' (final frozen snapshot)' : ' (rehearsal snapshot)'}: ${tableManifest.length} application tables, ${tableManifest.reduce((total, item) => total + item.row_count, 0)} rows, ${authUsers.length} Auth identities. Password hashes and sessions were not exported.`);
    console.log(`Private export files: ${EXPORT_DIR}`);
  } catch (error) {
    if (dataOutput) dataOutput.destroy();
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function readExport() {
  let manifest;
  let users;
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    users = JSON.parse(await readFile(USERS_PATH, 'utf8'));
  } catch {
    fail(`A complete private export is required at ${EXPORT_DIR}; run the export command first.`);
  }
  if (manifest.format_version !== 2 || !Array.isArray(manifest.tables) || !manifest.schema_inventory || !Array.isArray(users)) {
    fail('The migration export format is unsupported or incomplete.');
  }
  assertExactInventory(manifest.tables.map((entry) => `${entry.schema}.${entry.table}`), 'Export');
  if (users.length !== manifest.auth_user_count || digestText(JSON.stringify(users)) !== manifest.auth_users_sha256) {
    fail('The Auth identity export does not match its manifest.');
  }
  if (await digestFile(DATA_PATH) !== manifest.application_data_sha256) {
    fail('The application data export checksum does not match its manifest.');
  }
  return { manifest, users };
}

function validateFreeze() {
  if (process.env.LUNIDEX_MIGRATION_WRITE_FREEZE !== 'I_HAVE_FROZEN_WRITES') {
    fail('Set LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES only after signup, app writes, jobs, and source writes are frozen.');
  }
}

function validateFinalExport(manifest) {
  if (manifest.snapshot_is_final !== true || manifest.writes_frozen !== true) {
    fail('Import requires a final export created after the source write freeze; create a new export with --final after writes have actually stopped.');
  }
}

async function readTargetAuthUsers(client) {
  const { rows } = await client.query('select id::text, email from auth.users order by id');
  return rows.map((row) => ({ id: row.id, email: row.email }));
}

function assertTargetAuthSubset(existing, sourceUsers) {
  const sourceById = new Map(sourceUsers.map((user) => [user.id, user.email.toLowerCase()]));
  const sourceByEmail = new Map(sourceUsers.map((user) => [user.email.toLowerCase(), user.id]));
  for (const user of existing) {
    if (sourceById.get(user.id) !== user.email?.toLowerCase()) {
      fail('The target Auth database contains an identity that is not an exact ID/email match for this export. No Auth users were changed.');
    }
    if (sourceByEmail.get(user.email?.toLowerCase()) !== user.id) {
      fail('The target Auth database contains a conflicting email identity. No Auth users were changed.');
    }
  }
}

async function importAuthCommand() {
  validateFreeze();
  const { manifest, users } = await readExport();
  validateFinalExport(manifest);
  const target = validateTarget();
  const adminKey = requireSupabaseAdminKey(process.env);
  const databasePool = createPool(target.databaseUrl, 'lunidex-supabase-auth-import-preflight');
  const databaseClient = await databasePool.connect();
  try {
    await databaseClient.query('BEGIN');
    await databaseClient.query('SELECT pg_advisory_xact_lock(hashtext($1))', [LOCK_KEY]);
    const inventory = await getTableInventory(databaseClient);
    assertExactInventory(inventory, 'Supabase target');
    const targetForeignKeys = await getForeignKeys(databaseClient);
    if (digestText(JSON.stringify(targetForeignKeys)) !== digestText(JSON.stringify(manifest.foreign_keys))) {
      fail('Supabase target foreign-key definitions differ from the Neon export.');
    }
    assertSchemaInventory(await getSchemaInventory(databaseClient), manifest.schema_inventory, 'Supabase target');
    const existing = await readTargetAuthUsers(databaseClient);
    assertTargetAuthSubset(existing, users);
    if (existing.length > users.length) fail('The target Auth identity count exceeds the source export.');
    const marker = await databaseClient.query("select to_regclass('migration_control.neon_import_runs') is not null as exists");
    if (!marker.rows[0].exists) {
      for (const name of inventory) {
        const [schema, table] = name.split('.');
        const { rows } = await databaseClient.query(`select exists(select 1 from ${qualifiedName(schema, table)} limit 1) as has_rows`);
        if (rows[0].has_rows) fail(`Target table ${name} is not empty; Auth import was not started.`);
      }
    } else {
      const prior = await databaseClient.query('select source_digest from migration_control.neon_import_runs');
      if (prior.rows.length !== 1 || prior.rows[0].source_digest !== manifest.source_digest) {
        fail('A different migration export was already applied to this target.');
      }
      await verifyTargetData(databaseClient, manifest, users);
      await databaseClient.query('COMMIT');
      console.log(`This exact migration is already verified on Supabase project ${target.projectRef}; no Auth users were changed.`);
      return;
    }
    await databaseClient.query('COMMIT');
  } catch (error) {
    await databaseClient.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    databaseClient.release();
    await databasePool.end();
  }

  const admin = createClient(target.publicUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const existingIds = new Set((await (async () => {
    const pool = createPool(target.databaseUrl, 'lunidex-supabase-auth-import');
    try { return await readTargetAuthUsers(pool); } finally { await pool.end(); }
  })()).map((user) => user.id));

  let created = 0;
  for (const user of users) {
    if (existingIds.has(user.id)) continue;
    const { error } = await admin.auth.admin.createUser({
      id: user.id,
      email: user.email,
      email_confirm: user.email_confirmed,
      user_metadata: user.user_metadata,
    });
    if (error) {
      // A concurrent retry may have created the same exact identity. Accept
      // only that case; never search by email and silently adopt another UUID.
      const verifyPool = createPool(target.databaseUrl, 'lunidex-supabase-auth-import-verify');
      try {
        const current = await readTargetAuthUsers(verifyPool);
        assertTargetAuthSubset(current, users);
        if (!current.some((candidate) => candidate.id === user.id && candidate.email?.toLowerCase() === user.email.toLowerCase())) {
          fail('Supabase Auth rejected an identity import. The target was left with only the exact subset reported by the idempotent preflight.');
        }
      } finally {
        await verifyPool.end();
      }
      continue;
    }
    created += 1;
  }
  const finalPool = createPool(target.databaseUrl, 'lunidex-supabase-auth-import-final-check');
  try {
    const finalUsers = await readTargetAuthUsers(finalPool);
    assertTargetAuthSubset(finalUsers, users);
    if (finalUsers.length !== users.length) fail('The target Auth user count changed during import; review the target while writes remain frozen.');
  } finally {
    await finalPool.end();
  }
  console.log(`Supabase Auth import complete for project ${target.projectRef}: ${created} identities created; ${users.length - created} exact pre-existing identities skipped.`);
  console.log('UUIDs and email-confirmation state were preserved. Password hashes and sessions were not imported; every imported user must set a new password.');
  console.log(`Export source digest: ${manifest.source_digest}`);
}

async function getColumnMetadata(client, schema, table) {
  const { rows } = await client.query(`
    select column_name, is_generated
    from information_schema.columns
    where table_schema = $1 and table_name = $2
    order by ordinal_position
  `, [schema, table]);
  if (rows.length === 0) fail(`Target schema is missing ${schema}.${table}; apply the checked-in Supabase migrations before importing data.`);
  const writable = rows.filter((row) => row.is_generated === 'NEVER').map((row) => row.column_name);
  return { all: rows.map((row) => row.column_name), writable };
}

async function verifyTargetData(client, manifest, users) {
  const inventory = await getTableInventory(client);
  assertExactInventory(inventory, 'Supabase target');
  const actualForeignKeys = await getForeignKeys(client);
  if (digestText(JSON.stringify(actualForeignKeys)) !== digestText(JSON.stringify(manifest.foreign_keys))) {
    fail('Foreign-key definitions differ from the Neon export; no data import was committed.');
  }
  assertSchemaInventory(await getSchemaInventory(client), manifest.schema_inventory, 'Supabase target');
  const primaryKeys = await getPrimaryKeys(client, inventory);
  for (const expected of manifest.tables) {
    const name = `${expected.schema}.${expected.table}`;
    const actual = await rowChecksum(client, qualifiedName(expected.schema, expected.table), primaryKeys.get(name) ?? []);
    if (actual.count !== expected.row_count || actual.sha256 !== expected.rows_sha256) {
      fail(`Row count or checksum mismatch for ${name}; no data import was committed.`);
    }
  }
  const targetSequences = await getOwnedSequences(client, inventory);
  const targetByColumn = new Map(targetSequences.map((sequence) => [`${sequence.schema}.${sequence.table}.${sequence.column}`, sequence.last_value]));
  const sourceSequenceKeys = (manifest.sequences ?? []).map((sequence) => `${sequence.schema}.${sequence.table}.${sequence.column}`).sort();
  if (JSON.stringify([...targetByColumn.keys()].sort()) !== JSON.stringify(sourceSequenceKeys)) {
    fail('Owned sequence inventory differs from the Neon export; no data import was committed.');
  }
  for (const expected of manifest.sequences ?? []) {
    const key = `${expected.schema}.${expected.table}.${expected.column}`;
    const actualValue = targetByColumn.get(key);
    const { rows } = await client.query(
      `select max(${quoteIdentifier(expected.column)})::text as max_value from ${qualifiedName(expected.schema, expected.table)}`,
    );
    const requiredValue = [expected.last_value, rows[0].max_value]
      .filter((value) => value !== null && value !== undefined)
      .map(BigInt)
      .reduce((maximum, value) => value > maximum ? value : maximum, 0n);
    if (requiredValue > 0n && (actualValue === null || actualValue === undefined || BigInt(actualValue) < requiredValue)) {
      fail(`Sequence state is behind the source for ${key}; no data import was committed.`);
    }
  }
  const targetUsers = await readTargetAuthUsers(client);
  assertTargetAuthSubset(targetUsers, users);
  if (targetUsers.length !== users.length) fail('The target Auth user count does not match the source export.');
}

async function importDataCommand() {
  validateFreeze();
  const { manifest, users } = await readExport();
  validateFinalExport(manifest);
  const target = validateTarget();
  const pool = createPool(target.databaseUrl, 'lunidex-supabase-data-import');
  const client = await pool.connect();
  let insertedRows = 0;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [LOCK_KEY]);
    // Keep even the idempotency ledger DDL inside the guarded transaction so
    // any failed preflight leaves no target-side objects behind.
    await client.query('create schema if not exists migration_control');
    await client.query(`create table if not exists migration_control.neon_import_runs (
      source_digest text primary key,
      imported_at timestamptz not null default now(),
      project_ref text not null,
      table_count integer not null,
      row_count bigint not null
    )`);
    const prior = await client.query('select source_digest from migration_control.neon_import_runs');
    if (prior.rows.length > 0) {
      decideTargetImportState({ source_digest: manifest.source_digest, recorded_digests: prior.rows.map((row) => row.source_digest), non_empty_tables: [] });
      await verifyTargetData(client, manifest, users);
      await client.query('COMMIT');
      console.log(`This exact source digest is already verified on Supabase project ${target.projectRef}; no data was changed.`);
      return;
    }

    const currentAuthUsers = await readTargetAuthUsers(client);
    assertTargetAuthSubset(currentAuthUsers, users);
    if (currentAuthUsers.length !== users.length) fail('Import the source Auth identities first; application data import was not started.');
    const nonEmptyTables = [];
    for (const table of manifest.tables) {
      const qualified = qualifiedName(table.schema, table.table);
      const { rows } = await client.query(`select exists(select 1 from ${qualified} limit 1) as has_rows`);
      if (rows[0].has_rows) nonEmptyTables.push(`${table.schema}.${table.table}`);
    }
    decideTargetImportState({ source_digest: manifest.source_digest, recorded_digests: [], non_empty_tables: nonEmptyTables });

    const metadata = new Map();
    for (const table of manifest.tables) {
      metadata.set(`${table.schema}.${table.table}`, await getColumnMetadata(client, table.schema, table.table));
    }
    const tableOrder = new Map(manifest.tables.map((table, index) => [`${table.schema}.${table.table}`, index]));
    const input = createInterface({ input: (await import('node:fs')).createReadStream(DATA_PATH), crlfDelay: Infinity });
    let currentTableName = null;
    let currentTableOrder = -1;
    let batchRows = [];
    let batchBytes = 0;

    const flushBatch = async () => {
      if (!currentTableName || batchRows.length === 0) return;
      const tableMetadata = metadata.get(currentTableName);
      if (!tableMetadata) fail(`The application export contains an unknown table ${currentTableName}.`);
      const [schema, tableName] = currentTableName.split('.');
      const qualified = qualifiedName(schema, tableName);
      await client.query(
        buildBatchInsertQuery(qualified, tableMetadata.writable),
        [`[${batchRows.join(',')}]`],
      );
      insertedRows += batchRows.length;
      batchRows = [];
      batchBytes = 0;
    };

    for await (const line of input) {
      if (!line.trim()) continue;
      const item = JSON.parse(line);
      const tableName = `${item.schema}.${item.table}`;
      const tableMetadata = metadata.get(tableName);
      if (!tableMetadata || typeof item.row_json !== 'string') fail('The application export contains an unknown table or malformed row.');
      const nextTableOrder = tableOrder.get(tableName);
      if (nextTableOrder === undefined) fail(`The application export contains an unknown table ${tableName}.`);
      if (currentTableName !== tableName) {
        await flushBatch();
        if (nextTableOrder <= currentTableOrder) {
          fail('The application export rows are not grouped in the reviewed foreign-key dependency order.');
        }
        currentTableName = tableName;
        currentTableOrder = nextTableOrder;
      }

      const rowBytes = Buffer.byteLength(item.row_json, 'utf8');
      if (shouldFlushImportBatch(batchRows.length, batchBytes, rowBytes)) await flushBatch();
      batchRows.push(item.row_json);
      batchBytes += rowBytes;
      if (batchRows.length >= IMPORT_BATCH_MAX_ROWS || batchBytes >= IMPORT_BATCH_MAX_BYTES) await flushBatch();
    }
    await flushBatch();

    // Imported explicit IDs do not advance serial sequences automatically.
    const targetSequences = await getOwnedSequences(client, EXPECTED_TABLES);
    const targetSequenceByColumn = new Map(targetSequences.map((sequence) => [`${sequence.schema}.${sequence.table}.${sequence.column}`, sequence]));
    for (const sourceSequence of manifest.sequences ?? []) {
      const key = `${sourceSequence.schema}.${sourceSequence.table}.${sourceSequence.column}`;
      const targetSequence = targetSequenceByColumn.get(key);
      if (!targetSequence) fail(`Target is missing the sequence for ${key}; no data import was committed.`);
      const table = qualifiedName(sourceSequence.schema, sourceSequence.table);
      const column = quoteIdentifier(sourceSequence.column);
      const { rows } = await client.query(`select max(${column})::text as max_value from ${table}`);
      const candidates = [sourceSequence.last_value, rows[0].max_value].filter((value) => value !== null && value !== undefined).map(BigInt);
      if (candidates.length > 0) {
        const nextValueFloor = candidates.reduce((current, candidate) => candidate > current ? candidate : current);
        await client.query('select setval($1::regclass, $2::bigint, true)', [targetSequence.sequence_name, nextValueFloor.toString()]);
      }
    }

    await verifyTargetData(client, manifest, users);
    const rowCount = manifest.tables.reduce((total, table) => total + table.row_count, 0);
    await client.query(
      `insert into migration_control.neon_import_runs (source_digest, project_ref, table_count, row_count)
       values ($1, $2, $3, $4)`,
      [manifest.source_digest, target.projectRef, manifest.tables.length, rowCount],
    );
    await client.query('COMMIT');
    console.log(`Supabase data import verified: ${insertedRows} exported rows across ${manifest.tables.length} tables; source and target counts/checksums/FKs match.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function dryRunCommand() {
  const { manifest, users } = await readExport();
  const target = validateTarget();
  const pool = createPool(target.databaseUrl, 'lunidex-supabase-migration-dry-run');
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const inventory = await getTableInventory(client);
    assertExactInventory(inventory, 'Supabase target');
    const foreignKeys = await getForeignKeys(client);
    if (digestText(JSON.stringify(foreignKeys)) !== digestText(JSON.stringify(manifest.foreign_keys))) {
      fail('Supabase target foreign-key definitions differ from the Neon export.');
    }
    assertSchemaInventory(await getSchemaInventory(client), manifest.schema_inventory, 'Supabase target');
    const targetUsers = await readTargetAuthUsers(client);
    assertTargetAuthSubset(targetUsers, users);
    const marker = await client.query("select to_regclass('migration_control.neon_import_runs') is not null as exists");
    if (marker.rows[0].exists) {
      const prior = await client.query('select source_digest from migration_control.neon_import_runs');
      if (prior.rows.length !== 1 || prior.rows[0].source_digest !== manifest.source_digest) {
        fail('A different migration export was already applied to this target.');
      }
      await verifyTargetData(client, manifest, users);
      await client.query('COMMIT');
      console.log(`Read-only dry run passed: the exact export is already imported and verified on Supabase project ${target.projectRef}.`);
      return;
    }
    for (const name of inventory) {
      const [schema, table] = name.split('.');
      const { rows } = await client.query(`select exists(select 1 from ${qualifiedName(schema, table)} limit 1) as has_rows`);
      if (rows[0].has_rows) fail(`Target table ${name} is not empty; dry run refuses an existing application dataset.`);
    }
    await client.query('COMMIT');
    console.log(`Read-only dry run passed for Supabase project ${target.projectRef}: schema/FKs match, ${targetUsers.length}/${users.length} exact Auth identities already exist, and all ${inventory.length} application tables are empty.`);
    console.log(`The export contains ${manifest.tables.reduce((total, item) => total + item.row_count, 0)} application rows across ${manifest.tables.length} tables and ${manifest.sequences?.length ?? 0} sequence states.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function verifyCommand() {
  const { manifest, users } = await readExport();
  const target = validateTarget();
  const pool = createPool(target.databaseUrl, 'lunidex-supabase-migration-verify');
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await verifyTargetData(client, manifest, users);
    await client.query('COMMIT');
    console.log(`Migration verification passed for Supabase project ${target.projectRef}: ${manifest.tables.length} tables, ${manifest.tables.reduce((total, item) => total + item.row_count, 0)} application rows, ${users.length} Auth users, foreign-key definitions and deterministic row checksums match.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'export') {
    const option = process.argv[3];
    if (option !== undefined && option !== '--final') fail('Export accepts only the optional --final flag.');
    return exportCommand(option === '--final');
  }
  if (command === 'dry-run') return dryRunCommand();
  if (command === 'import-auth') return importAuthCommand();
  if (command === 'import-data') return importDataCommand();
  if (command === 'verify') return verifyCommand();
  fail('Use one command: export, dry-run, import-auth, import-data, or verify.');
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) main().catch((error) => {
  if (error instanceof MigrationError) {
    console.error(`Migration stopped safely: ${error.message}`);
  } else {
    const code = error && typeof error === 'object' && 'code' in error ? ` (${String(error.code)})` : '';
    console.error(`Migration failed${code}. Connection values and user identities were not logged; inspect the local export and database availability before retrying.`);
  }
  process.exitCode = 1;
});

export {
  EXPECTED_TABLES,
  assertExactInventory,
  buildExportManifest,
  buildBatchInsertQuery,
  decideTargetImportState,
  assertSchemaInventory,
  shouldFlushImportBatch,
  parseProjectRef,
  validateFinalExport,
  validateTarget,
};
