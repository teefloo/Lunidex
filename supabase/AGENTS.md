# Supabase Guide

This directory contains the database migrations and the Supabase Edge Functions used by PrimeDex. The web and mobile clients remain local-first when public Supabase configuration is absent.

## Migrations

- Apply migrations in timestamp order. Existing migrations cover battle rooms, user state, profiles, quiz scores and leaderboard RPCs, public profile data, TCG price history, and friends.
- Treat RLS policies, grants, indexes, and RPC signatures as production interfaces. Review the complete migration history before changing a table or policy.
- Protect user-owned rows with RLS and use the authenticated user from `auth.uid()`. Public profile and leaderboard reads must expose only the columns and rows intended for public access.
- Keep JSONB user-state changes compatible with both `src/store/primedex.ts` and `packages/core/src/store/primedex.ts`; update the corresponding synchronized keys and migrations together when necessary.
- Use the Supabase CLI or SQL editor deliberately. Never commit local credentials, `.env` files, service-role keys, or generated secrets.

## Edge Functions

- Functions run in Deno and must keep their imports and APIs Deno-compatible. The `poll-tcg-prices` function reads Supabase secrets and polls TCGdex pricing data.
- Required secrets for `poll-tcg-prices` are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET`.
- Deploy the function only after reviewing secret configuration and authentication requirements:

```bash
supabase functions deploy poll-tcg-prices --no-verify-jwt
```

- The function is intended for scheduled execution. Keep external fetches bounded, handle partial upstream failures, and avoid logging personal data or credentials.
- When deployed without JWT verification, the scheduler must make an authenticated `POST` with `Authorization: Bearer <CRON_SECRET>`; an absent secret must fail closed.

## Verification

For schema changes, inspect RLS and migration ordering, then run the relevant local Supabase checks or apply the migration in a disposable project before deployment. Coordinate client type and sync changes with the web and core package checks:

```bash
npm run lint
npm run typecheck
npm run test -- --run
```
