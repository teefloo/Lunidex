# Supabase compatibility and Edge Function guide

This guide applies to `supabase/`. The current web/mobile runtime uses Neon Auth and Neon PostgreSQL; this directory contains retained Supabase source migrations for comparison/rollback and a separately deployed Supabase Edge Function. Do not use this directory as evidence that the application runtime still uses Supabase Auth or Supabase RLS.

## Boundaries

- Read `supabase/migrations/AGENTS.md` before touching SQL migrations and `supabase/functions/AGENTS.md` before touching the Deno function.
- Treat migration filenames, table/RPC signatures, RLS policies, grants, indexes, function owners, search paths, and retention behavior as compatibility/security interfaces.
- Keep `SECURITY_AUDIT.md` and its reviewed security assumptions aligned with any security-sensitive migration change.
- The web's historical `src/lib/supabase` and `packages/core/src/supabase` paths are compatibility names for sync/leaderboard behavior; do not replace Neon runtime code with Supabase clients as part of a documentation or schema change.

## Secrets and external operations

- `SUPABASE_DB_URL` is used by the one-time export/Neon migration tooling, not by the browser or mobile runtime.
- The `poll-tcg-prices` function reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, VAPID variables, and `CRON_SECRET` from Supabase secrets. Never commit or log them.
- There is no Supabase CLI package script or checked-in `supabase/config.toml` in this repository. Do not present `supabase db push`, `supabase db reset`, or deployment as a routine local command; use a configured disposable/staging project and explicit approval for any external operation.
- The documented function deployment command changes external state and requires confirmation:

  ```bash
  supabase functions deploy poll-tcg-prices --no-verify-jwt
  ```

## Verification

Run the relevant static/Node tests from the root, plus the native Supabase/Deno checks only in an environment that actually provides them. Coordinate any data-contract change with the root lint, type-check, test, build, and applicable Neon checks.
