import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260729000000_lunidex_product_metrics.sql'), 'utf8');

describe('lunidex product metrics migration', () => {
  it('uses distinct delimiters for the optional pg_cron dynamic SQL block', () => {
    expect(migration).toContain('do $block$');
    expect(migration).toContain('execute $sql$');
    expect(migration).toContain('$sql$;');
    expect(migration).toContain('$block$;');
    expect(migration).not.toContain('do $$');
  });
});
