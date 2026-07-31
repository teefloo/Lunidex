# Supabase security audit — 1 August 2026

Scope: static review of the migration chain through `20260729000000` and the
additive corrective migration `20260731010403`. No local PostgreSQL, pgTAP,
Supabase project, staging project, or production project has been accessed in
this audit. The SQL tests below are prepared but **not yet executed**.

## Pending migration review

| Migration | Finding | Additive resolution |
| --- | --- | --- |
| `20260728015223_harden_public_profiles_and_mutations.sql` | Restricts profile projection, quiz writes and battle-room mutation, but its privileged quiz RPC needs a hardened execution surface. | Explicit grants/revokes and deterministic `search_path`; no historical migration is edited. |
| `20260728030000_fix_friendship_rls_recursion.sql` | `SECURITY DEFINER` is justified because the directory/friendship RLS predicates otherwise recurse. The response RPC needs an explicit null-auth guard. | Keeps its privileged mode, checks `auth.uid()`, and limits execution to `authenticated`. |
| `20260729000000_lunidex_product_metrics.sql` | Metrics are private by ACL, but its conditional job permits a non-retained deployment when Cron is absent. | Fails closed without `pg_cron`, checks the current service-role JWT claim, and installs one named job. |

## SECURITY DEFINER inventory

Owner values cannot be inferred from files. They must be read from `pg_proc` on
the isolated staging database after migration; the usual owner is the migration
executor, often `postgres`, but this has not been verified.

| Function | Schema | `search_path` | Required EXECUTE role | Application caller / purpose |
| --- | --- | --- | --- | --- |
| `handle_new_user()` | `public` | `pg_catalog, public` | none; trigger-only | `auth.users` signup trigger |
| `sync_public_profile_from_user_state()` | `public` | `pg_catalog, public` | none; trigger-only | profile projection trigger |
| `set_public_profile(text, boolean)` | `public` | `pg_catalog, public` | `authenticated` | `src/lib/api/public-profile.ts`, `src/components/dashboard/AccountCard.tsx` |
| `sync_friend_directory()` | `public` | `pg_catalog, public` | none; trigger-only | friend-directory trigger |
| `sync_friend_snapshots()` | `public` | `pg_catalog, public` | none; trigger-only | snapshot projection trigger |
| `send_friend_request(text)` | `public` | `pg_catalog, public` | `authenticated` | `src/lib/friends.ts` |
| `respond_to_friend_request(uuid, text)` | `public` | `pg_catalog, public` | `authenticated` | `src/lib/friends.ts` |
| `submit_quiz_score(text, text, integer, text)` | `public` | `pg_catalog, public` | `authenticated` | `src/app/api/quiz/leaderboard/route.ts` |
| `increment_daily_metric(text, text, text)` | `analytics` | `pg_catalog, analytics` | `service_role` | `src/app/api/analytics/product/route.ts` through the server-only client |

All nine functions explicitly revoke `PUBLIC`, `anon`, and `authenticated`.
Only the four user RPCs are re-granted to `authenticated`; only the metrics RPC
is re-granted to `service_role`. Trigger-only functions receive no API grant.
The metrics function reads `(auth.jwt() ->> 'role')`, not deprecated
`auth.role()`: Supabase documents `auth.jwt()` as the current JWT helper and
documents `auth.role()` as deprecated for authorization decisions.

## Retention definition

`metric_date` is a PostgreSQL `date`, so retention uses UTC database calendar
dates rather than elapsed 24-hour timestamps. "90 days" means exactly the 90
dates `current_date - 89` through `current_date`, inclusive. A row dated
`current_date - 90` is deleted. The pgTAP test includes both boundary rows.

## Staging runbook (not run)

Use a separate disposable staging project, never `--linked`, `db push`, or a
production connection.

1. Enable Cron under **Dashboard → Integrations → Cron**, then apply migrations.
2. Run `supabase db reset`, `supabase test db`, and `supabase db advisors`.
   Repeat with a database migrated only through `20260726000000_friends` before
   applying the three pending migrations and `20260731010403`.
3. Verify owners, all definitions, configured paths and effective grants:

```sql
select
  n.nspname as schema,
  p.oid::regprocedure as function,
  pg_get_userbyid(p.proowner) as owner,
  p.proconfig as function_config,
  array_agg(r.rolname order by r.rolname) filter (
    where r.rolname in ('public', 'anon', 'authenticated', 'service_role')
      and has_function_privilege(r.oid, p.oid, 'EXECUTE')
  ) as effective_execute_roles
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where p.prosecdef
group by n.nspname, p.oid
order by n.nspname, p.oid::regprocedure::text;
```

4. Check that untrusted API roles cannot create names in `public`; record the
   result before accepting the release:

```sql
select rolname, has_schema_privilege(rolname, 'public', 'CREATE') as can_create
from pg_roles
where rolname in ('public', 'anon', 'authenticated', 'service_role')
order by rolname;
```

5. Inspect `public.public_profiles` in `supabase db advisors` and confirm it
   exposes no email/private columns. Also inspect `pg_get_viewdef` and its ACL;
   resolve any security-definer-view advisor finding before release.
6. Insert the two retention-boundary fixtures, wait for or temporarily schedule
   the job in staging, then inspect both `cron.job` and `cron.job_run_details`:

```sql
select jobid, schedule, jobname, command
from cron.job
where jobname = 'prune-lunidex-product-metrics';

select status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'prune-lunidex-product-metrics')
order by start_time desc
limit 10;
```

Supabase documents Cron job execution details in `cron.job_run_details` and
requires enabling the extension through its Cron integration. [Cron
documentation](https://supabase.com/docs/guides/cron), [Cron
installation](https://supabase.com/docs/guides/cron/install), [RLS/JWT
helpers](https://supabase.com/docs/guides/database/postgres/row-level-security),
and [deprecated RLS features](https://supabase.com/docs/guides/troubleshooting/deprecated-rls-features-Pm77Zs).

## Tested rollback procedure (to execute in staging first)

This rollback is specified, not yet tested. Run each step separately in a
transaction on staging and rerun the pgTAP suite after each affected function.

1. Remove only the retention schedule: `select cron.unschedule(jobid) from
   cron.job where jobname = 'prune-lunidex-product-metrics';` Verify no other
   job is removed and inspect `cron.job_run_details` before cleanup.
2. For each user RPC (`set_public_profile`, `send_friend_request`,
   `respond_to_friend_request`, `submit_quiz_score`), restore its immediately
   preceding reviewed definition only if its focused behavioral test fails.
   Preserve the `PUBLIC` revocation and explicit `authenticated` grant.
3. For `increment_daily_metric`, restore the previous function body only after
   retaining the `PUBLIC`/`anon`/`authenticated` revokes and the sole
   `service_role` grant. Never reintroduce `auth.role()`.
4. For trigger-only functions, restore an individual prior definition only if
   its trigger regression is demonstrated; preserve no-execute grants and the
   deterministic path. Do not drop the owner policies as a rollback shortcut.
5. Recreate the deterministic UPDATE policies from this migration after any
   rollback. They are the authoritative owner/recipient constraints.
