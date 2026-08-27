# Neon schema guide

`neon/migrations/` contains the application schema used by the current Neon-backed server runtime. The former Supabase migration archive has been removed; `supabase/` is not a second schema source.

## Schema contract

- Review the complete `neon/migrations/0001_lunidex_app.sql` before changing tables, functions, indexes, projections, or constraints. The schema is consumed by `src/lib/neon/`, server Route Handlers, the shared state sync, and the migration scripts.
- Neon Auth owns authentication credentials and sessions. `app.users` is the application-side identity projection; do not add password hashes, refresh tokens, or client-visible connection strings to this schema.
- Server/API code authenticates with Neon Auth and enforces ownership. Do not reintroduce Supabase `auth.uid()`, `anon`, or `authenticated` assumptions into the Neon schema without an explicit architecture change.
- Keep JSONB `public.user_state`, public-profile/friend projections, quiz scores, TCG prices/alerts, push subscriptions, and analytics contracts compatible with their callers and with `SYNCED_KEYS`.
- Treat changes as data migrations: consider existing rows, indexes, foreign keys, triggers, functions, grants, and rollback/canary behavior before editing the SQL.

## Environment and verification

- Vercel supplies the server-only `DATABASE_URL`; local server/migration scripts use `NEON_DATABASE_URL`. Neither belongs in client or mobile variables.
- The root scripts are the available migration workflow:

```bash
npm run db:neon:export
npm run db:neon:import
npm run db:neon:verify
```

Their prerequisites, source/target variables, ignored artifact directory, and mutation warnings are defined in `scripts/neon/AGENTS.md`. Importing or verifying against a real database is an external operation; use an approved disposable/staging target and do not run it against production casually.

After a schema contract change, run the root CI checks and the relevant core/mobile type-checks.
