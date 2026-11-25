import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  EXPECTED_TABLES,
  assertSchemaInventory,
  buildBatchInsertQuery,
  buildExportManifest,
  decideTargetImportState,
  shouldFlushImportBatch,
  validateFinalExport,
  validateTarget,
} from './neon-to-supabase.mjs';

function profileSchemaInventory(options) {
  return {
    columns: [],
    constraints: [],
    indexes: [],
    triggers: [],
    routines: [],
    views: [{
      schema_name: 'public',
      view_name: 'public_profiles',
      view_kind: 'v',
      definition: 'SELECT profiles.id FROM public.profiles',
      options,
    }],
    extensions: [],
    sequence_definitions: [],
  };
}

test('manifest binds data, identities, schema objects, and final snapshot state', () => {
  const input = {
    server_version_num: '170006',
    tables: EXPECTED_TABLES.map((name) => {
      const [schema, table] = name.split('.');
      return { schema, table, row_count: 0, rows_sha256: '0'.repeat(64) };
    }),
    foreign_keys: [{ child: 'public.user_state', name: 'user_state_user_id_fkey', parent: 'app.users', definition: 'FOREIGN KEY (user_id) REFERENCES app.users(id)' }],
    schema_inventory: {
      columns: [{ schema_name: 'app', table_name: 'users', ordinal_position: 1, column_name: 'id', data_type: 'uuid' }],
      constraints: [{ schema_name: 'app', table_name: 'users', constraint_name: 'users_pkey', constraint_type: 'p' }],
      indexes: [{ schema_name: 'app', table_name: 'users', index_name: 'users_pkey', definition: 'CREATE UNIQUE INDEX users_pkey ON app.users USING btree (id)' }],
      triggers: [],
      routines: [],
      views: [],
      extensions: [{ extension_name: 'pgcrypto', version: '1.3' }],
      sequence_definitions: [],
    },
    sequences: [],
    auth_users: [{ id: '11111111-1111-4111-8111-111111111111', email: 'user@example.test' }],
    application_data_sha256: 'a'.repeat(64),
    final_export: true,
  };

  const manifest = buildExportManifest(input);
  const repeated = buildExportManifest(input);
  const changedSchema = buildExportManifest({
    ...input,
    schema_inventory: { ...input.schema_inventory, views: [{ schema_name: 'public', view_name: 'public_profiles', view_kind: 'v' }] },
  });
  assert.equal(manifest.format_version, 2);
  assert.equal(manifest.snapshot_is_final, true);
  assert.equal(manifest.writes_frozen, true);
  assert.equal(manifest.tables.length, 31);
  assert.equal(manifest.schema_inventory.extensions[0].extension_name, 'pgcrypto');
  assert.equal(manifest.source_digest, repeated.source_digest);
  assert.notEqual(manifest.source_digest, changedSchema.source_digest);
  assert.match(manifest.source_digest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.auth_passwords_exported, false);
  assert.doesNotThrow(() => validateFinalExport(manifest));
  assert.throws(() => validateFinalExport({ ...manifest, snapshot_is_final: false, writes_frozen: false }), /requires a final export/);
});

test('target URL and explicit project ref must identify the same Supabase project', () => {
  const matching = {
    SUPABASE_PROJECT_REF: 'lunidex-stage',
    SUPABASE_URL: 'https://lunidex-stage.supabase.co',
    SUPABASE_MIGRATION_DATABASE_URL: 'postgresql://postgres.lunidex-stage:unused@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
  };
  assert.equal(validateTarget(matching).projectRef, 'lunidex-stage');
  assert.throws(
    () => validateTarget({ ...matching, SUPABASE_PROJECT_REF: 'another-project' }),
    /does not match the configured Supabase API URL/,
  );
});

test('migration refuses any unmarked non-empty target and only accepts an exact idempotent digest', () => {
  assert.throws(
    () => decideTargetImportState({ source_digest: 'source-a', recorded_digests: [], non_empty_tables: ['public.user_state'] }),
    /is not empty/,
  );
  assert.equal(decideTargetImportState({ source_digest: 'source-a', recorded_digests: [], non_empty_tables: [] }), 'import');
  assert.equal(decideTargetImportState({ source_digest: 'source-a', recorded_digests: ['source-a'], non_empty_tables: [] }), 'verify-existing');
  assert.throws(
    () => decideTargetImportState({ source_digest: 'source-a', recorded_digests: ['source-b'], non_empty_tables: [] }),
    /different or ambiguous/,
  );
  assert.throws(
    () => decideTargetImportState({ source_digest: 'source-a', recorded_digests: ['source-a', 'source-a'], non_empty_tables: [] }),
    /different or ambiguous/,
  );
});

test('schema comparison accepts only the reviewed Supabase public_profiles security_invoker hardening', () => {
  const source = profileSchemaInventory(['security_barrier=true']);
  const target = profileSchemaInventory(['security_barrier=true', 'security_invoker=true']);
  assert.doesNotThrow(() => assertSchemaInventory(target, source, 'Supabase target'));
});

test('schema comparison rejects missing security_invoker and unrelated public_profiles option changes', () => {
  const source = profileSchemaInventory(['security_barrier=true']);
  assert.throws(
    () => assertSchemaInventory(profileSchemaInventory(['security_barrier=true']), source, 'Supabase target'),
    /must have exactly one security_invoker=true/,
  );
  assert.throws(
    () => assertSchemaInventory(profileSchemaInventory([
      'security_barrier=true',
      'security_invoker=true',
      'unreviewed_option=true',
    ]), source, 'Supabase target'),
    /differ from the source export/,
  );
});

test('import batches preserve writable-column filtering and conflict-safe inserts', () => {
  const query = buildBatchInsertQuery('"public"."profiles"', ['id', 'name']);
  assert.match(query, /jsonb_populate_recordset\(NULL::"public"\."profiles", \$1::jsonb\)/);
  assert.match(query, /insert into "public"\."profiles" \("id", "name"\)/);
  assert.match(query, /select mapped\."id", mapped\."name" from mapped/i);
  assert.match(query, /on conflict do nothing/i);
  assert.doesNotMatch(query, /email|generated_column/i);
  assert.throws(() => buildBatchInsertQuery('"public"."profiles"', []), /no writable columns/);
});

test('import batches flush at row and byte bounds without rejecting a single large row', () => {
  const byteLimit = 8 * 1024 * 1024;
  assert.equal(shouldFlushImportBatch(0, 0, byteLimit + 1), false);
  assert.equal(shouldFlushImportBatch(1, byteLimit, 1), true);
  assert.equal(shouldFlushImportBatch(500, 1, 1), true);
  assert.equal(shouldFlushImportBatch(1, byteLimit - 1, 1), false);
});

test('migration script uses a repeatable read-only source snapshot and has no destructive reset path', async () => {
  const source = await readFile(new URL('./neon-to-supabase.mjs', import.meta.url), 'utf8');
  assert.match(source, /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.doesNotMatch(source, /\bTRUNCATE\b|\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b|pg_restore[^\n]*--clean/i);
  assert.match(source, /on conflict do nothing/i);
});
