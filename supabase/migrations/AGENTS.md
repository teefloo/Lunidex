# Supabase migration guide

These SQL files are retained Supabase source history used for rollback/comparison with the Neon schema. They are not the current web application's runtime migration directory.

## Safe changes

- Apply or inspect migrations in timestamp order. Do not rename, reorder, silently rewrite, or delete a migration that an environment may have applied; add a reviewed migration when an additive change is required.
- Before changing a table, policy, grant, RPC, trigger, index, function owner, `search_path`, or retention rule, review the complete history and `supabase/SECURITY_AUDIT.md`.
- Preserve ownership checks based on `auth.uid()`, public-profile/leaderboard column boundaries, explicit grants, and hardened function search paths. Coordinate JSONB user-state changes with both store implementations and the Neon migration rather than changing one copy in isolation.
- Pair migration behavior changes with the nearby `.test.ts` checks when possible. The `.test.sql` database checks require a configured Supabase/pgTAP environment and are not run by the root Vitest configuration.

## Checks

The tracked TypeScript migration tests can be run directly, for example:

```bash
npx vitest run supabase/migrations/20260729000000_lunidex_product_metrics.test.ts
npx vitest run supabase/migrations/20260731010403_harden_privileged_functions_and_metrics_retention.test.ts
npx vitest run supabase/migrations/20260802014629_harden_invoker_function_search_paths.test.ts
npm run test -- --run
```

Applying SQL, running pgTAP, or using Supabase dashboard/CLI tooling is an external database operation. Use only a disposable/staging project after reviewing the target and obtaining approval.
