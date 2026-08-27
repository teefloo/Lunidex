# Supabase compatibility and Edge Function guide

This guide applies to `supabase/`. The current web/mobile runtime uses Neon Auth and Neon PostgreSQL; this directory contains an archived Supabase Edge Function and historical security material. The former Supabase SQL migration archive is no longer checked in. Do not use this directory as evidence that the application runtime still uses Supabase Auth or Supabase RLS.

## Boundaries

- Read `supabase/functions/AGENTS.md` before touching the Deno function.
- Treat the archived function's secrets, outbound endpoints, and security checks as compatibility/security interfaces.
- Keep `SECURITY_AUDIT.md` clearly marked as historical; it is not an active migration or deployment source.
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

Run the relevant static checks from the root. Coordinate any data-contract change with the root lint, type-check, build, and applicable Neon checks.
