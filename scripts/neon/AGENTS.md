# Historical Supabase-to-Neon migration scripts guide

These scripts are retained as historical evidence for the earlier Supabase-to-Neon migration. They are not application runtime code and must not be used for the current Neon-to-Supabase migration. Read `docs/supabase-migration.md` for the active runbook.

## Preconditions and effects

- `export-supabase.sh`, `import-to-neon.sh`, and `verify-migration.sh` describe the previous Supabase-to-Neon direction only. Do not run them with current credentials or reuse their artifacts.
- Keep connection strings out of source, logs, chat, and committed files. Do not broaden table lists, disable triggers, or alter source/target mappings without reviewing the entire migration workflow.

## Commands

These archived scripts are not package entry points. The current entry points are:

```bash
npm run db:migrate:supabase:export
npm run db:migrate:supabase:dry-run
```

Export is read-oriented but creates local artifacts; import and verify access external databases. Do not run either against production, and do not push, deploy, or switch traffic as part of these scripts without explicit confirmation.
