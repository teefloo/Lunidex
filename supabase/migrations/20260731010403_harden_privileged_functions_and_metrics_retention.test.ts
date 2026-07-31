import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260731010403_harden_privileged_functions_and_metrics_retention.sql'),
  'utf8',
);

describe('privileged-function and metrics-retention migration', () => {
  it('restores owner-only deletion and preserves complete UPDATE policies', () => {
    expect(migration).toContain('create policy "user_state_delete_own"');
    expect(migration).toContain('for delete');
    expect(migration).toContain('using ((select auth.uid()) = user_id)');
    expect(migration).toContain('drop policy if exists "user_state_update_own"');
    expect(migration).toContain('drop policy if exists "profiles_update_own"');
    expect(migration).toContain('drop policy if exists friendships_update_recipient');
    expect(migration).toContain('with check ((select auth.uid()) = user_id)');
    expect(migration).toContain('with check ((select auth.uid()) = id)');
  });

  it('removes PUBLIC execution from all privileged application RPCs', () => {
    for (const signature of [
      'public.set_public_profile(text, boolean)',
      'public.send_friend_request(text)',
      'public.respond_to_friend_request(uuid, text)',
      'public.submit_quiz_score(text, text, integer, text)',
      'analytics.increment_daily_metric(text, text, text)',
    ]) {
      expect(migration).toContain(`revoke all on function ${signature} from public`);
    }
  });

  it('requires service-role authentication before metrics writes', () => {
    expect(migration).toContain("(select auth.jwt() ->> 'role') is distinct from 'service_role'");
    expect(migration).not.toContain('auth.role()');
    expect(migration).toContain("raise exception 'Service role required'");
    expect(migration).toContain('grant execute on function analytics.increment_daily_metric(text, text, text) to service_role');
  });

  it('uses a fail-closed, observable pg_cron retention job', () => {
    expect(migration).toContain("message = 'pg_cron is required for analytics retention'");
    expect(migration).toContain("'prune-lunidex-product-metrics'");
    expect(migration).toContain("'15 3 * * *'");
    expect(migration).toContain('delete from analytics.daily_metrics where metric_date < current_date - 89');
    expect(migration).not.toContain('Fallback manual purge');
  });
});
