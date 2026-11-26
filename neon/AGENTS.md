# Historical Neon schema guide

`neon/migrations/` is the historical schema baseline used by the previous Neon runtime. The active schema and runtime live under `supabase/`. Do not add new runtime features or forward migrations here.

## Schema contract

- Review the original migrations to understand how existing application rows and constraints were created. The current schema snapshot is `supabase/migrations/`.
- Neon Auth previously owned authentication credentials and sessions. The Supabase migration preserves identity UUIDs, but password hashes and sessions are not imported; users must reset passwords.
- Do not point active application runtime code at Neon or use this folder for reverse migrations.
- Keep JSONB `public.user_state`, public-profile/friend projections, quiz scores, TCG prices/alerts, push subscriptions, and analytics contracts compatible with their callers and with `SYNCED_KEYS`.
- Treat changes as data migrations: consider existing rows, indexes, foreign keys, triggers, functions, grants, and rollback/canary behavior before editing the SQL.

## Environment and verification

- `NEON_SOURCE_DATABASE_URL` is read-only source access for the one-time Neon-to-Supabase export only. The application no longer uses Neon.
- The current migration workflow is documented in `docs/supabase-migration.md`; old scripts under `scripts/neon/` only record the earlier Supabase-to-Neon migration and must not be reused for the reverse direction.

```bash
npm run db:migrate:supabase:export
npm run db:migrate:supabase:dry-run
```

Their prerequisites, source/target variables, ignored artifact directory, and mutation warnings are defined in `scripts/neon/AGENTS.md`. Importing or verifying against a real database is an external operation; use an approved disposable/staging target and do not run it against production casually.

After a schema contract change, run the root CI checks and the migration-specific validation described in `scripts/neon/AGENTS.md` when the change affects migration behavior.
