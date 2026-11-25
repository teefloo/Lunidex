# Supabase runtime and schema guide

Supabase is the active Auth and PostgreSQL provider for the Lunidex web app. Read `docs/supabase-migration.md` before schema, account, data, or cutover work. `supabase/functions/` remains a separately deployed historical Edge Function; it is not the web runtime's scheduler.

## Schema and security boundaries

- Apply schema changes as ordered SQL migrations in `supabase/migrations/`. The first migration carries the current 31-table application schema; the next enables RLS and explicit grants.
- All 31 application tables have RLS enabled. Data API access is fail-closed by default (`auto_expose_new_tables = false`) and only approved reads are granted. Do not expose tables or functions casually.
- Public profile projection uses a `security_invoker` view. Any view or function change must be reviewed for privilege/RLS bypass.
- The Next.js server uses a dedicated, server-only `SUPABASE_DATABASE_URL` pool whose `postgres` role bypasses RLS. Every API handler must authenticate with `auth.getUser()` and enforce row ownership and input validation in its own server code. Do not describe those server queries as RLS-enforced.
- Account deletion soft-deactivates the application identity and removes the Supabase Auth identity; policies also require an active application identity so existing JWTs cannot read user rows after deletion is requested.
- Do not grant client mutations. Use validated, rate-limited server routes for application writes.

## Environment separation

- Browser config: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only.
- Long-running OVH runtime: `SUPABASE_DATABASE_URL` using the shared session pooler, TLS verification, and a small `pg` pool; `SUPABASE_SERVICE_ROLE_KEY` is server-only and used only for Auth administration.
- One-time migration tooling: `NEON_SOURCE_DATABASE_URL` (read-only), `SUPABASE_MIGRATION_DATABASE_URL` (explicit target), `SUPABASE_PROJECT_REF`, and the protected service role key. The migration URL and runtime URL are distinct.
- The archived Edge Function has its own deployment secret names. Do not reuse the app runtime URL or mix its VAPID/cron settings with web configuration.

## Local verification

Use the CLI pinned by CI for database verification and inspect its help before commands whose behavior can change:

```bash
npx --yes supabase@3.4.0 --version
npx --yes supabase@3.4.0 start
npx --yes supabase@3.4.0 migration up
npx --yes supabase@3.4.0 test db
npx --yes supabase@3.4.0 stop --no-backup
```

Run these commands only with Docker available. CI starts isolated local PostgreSQL and GoTrue containers, excludes the hosted-facing services, applies the checked-in migrations, runs pgTAP, and stops the stack. Never link the CLI to a hosted project for this check, and never run `supabase db reset` against a remote project. See `docs/supabase-migration.md` for the migration limits and staging preconditions. Do not apply SQL to hosted projects or deploy the archived function as part of routine local validation.
