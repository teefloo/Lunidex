# Neon migration scripts guide

These scripts are one-time migration tooling, not application runtime code. Run them from the repository root and read `neon/AGENTS.md` first.

## Preconditions and effects

- `export-supabase.sh` requires `pg_dump`, `psql`, and `SUPABASE_DB_URL`. It writes the ignored `.neon-migration/` directory and reads the source database.
- `import-to-neon.sh` requires `pg_restore`, `psql`, `NEON_DATABASE_URL`, a prepared `.neon-migration/` export, and `neon/migrations/0001_lunidex_app.sql`. It creates/updates the target schema, temporarily disables user triggers while loading data, and therefore changes the target database.
- `verify-migration.sh` requires `psql`, both `SUPABASE_DB_URL` and `NEON_DATABASE_URL`, and compares row counts plus required Neon objects. A successful comparison is not a substitute for application/canary validation.
- Keep connection strings out of source, logs, chat, and committed files. Do not broaden table lists, disable triggers, or alter source/target mappings without reviewing the entire migration workflow.

## Commands

The package scripts are the supported entry points:

```bash
npm run db:neon:export
npm run db:neon:import
npm run db:neon:verify
```

Export is read-oriented but creates local artifacts; import and verify access external databases. Do not run either against production, and do not push, deploy, or switch traffic as part of these scripts without explicit confirmation.
