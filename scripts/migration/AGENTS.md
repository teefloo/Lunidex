# Neon-to-Supabase migration tooling

This directory contains the current one-time, one-direction Neon-to-Supabase migration utility. Read `docs/supabase-migration.md` before operating it. `scripts/neon/` is the archived reverse-direction workflow and must not be reused.

## Safety contract

- `export` opens Neon in a `REPEATABLE READ READ ONLY` transaction, checks the exact expected 31-table inventory, captures column definitions, FK and non-FK constraints, indexes, triggers, routines, views, pgcrypto, sequence definitions and owned sequence state, exports deterministic row checksums, and exports only the reviewed Auth identity fields. The ordinary export is a rehearsal snapshot; import requires an explicit `--final` export after a real source write freeze.
- `dry-run` is read-only and requires a complete local export plus an explicit target project ref/API URL/database URL match. It refuses a non-empty target unless the exact same source digest is already recorded and verified.
- `import-auth` and `import-data` require `LUNIDEX_MIGRATION_WRITE_FREEZE=I_HAVE_FROZEN_WRITES` and a `--final` manifest. Data inserts run in FK dependency order and bounded batches (500 rows/8 MiB maximum), while excluding generated columns and using `ON CONFLICT DO NOTHING`. They refuse conflicting IDs/emails, unexpected table/schema inventories, non-empty target data, or an export mismatch. They do not truncate, clean, drop, reset, or overwrite rows.
- Auth IDs and email confirmation state are preserved, but passwords, OAuth identities, and sessions are not copied. A password reset and provider reauthentication are required. Never fabricate identity rows or change a conflicting UUID to fit the target.
- Do not put connection strings or service-role keys in command arguments, output, or committed files. Use ignored `.env.local`/protected environment variables and never echo them.
- A checksum match validates the exported snapshot only. It does not prove a successful hosted cutover, live-auth behavior, or a production isolation test. Require a separate disposable/staging rehearsal before production.

The supported commands and their preconditions are in `docs/supabase-migration.md`.
