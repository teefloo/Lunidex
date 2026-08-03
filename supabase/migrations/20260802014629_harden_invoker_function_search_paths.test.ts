import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260802014629_harden_invoker_function_search_paths.sql'),
  'utf8',
);

const functionSignatures = [
  'public.quiz_leaderboard_top(date, integer)',
  'public.quiz_leaderboard_user_rank(uuid, date)',
  'public.set_updated_at()',
  'public.enforce_friendship_transition()',
];

describe('invoker-function search-path migration', () => {
  it('pins the exact four function signatures to trusted schemas', () => {
    for (const signature of functionSignatures) {
      expect(migration).toContain(`alter function ${signature}\n  set search_path = pg_catalog, public;`);
    }

    expect(migration.match(/alter function /g)).toHaveLength(functionSignatures.length);
  });

  it('does not recreate functions or change execution privileges', () => {
    expect(migration).not.toMatch(/\bcreate\s+(?:or\s+replace\s+)?function\b/i);
    expect(migration).not.toMatch(/\b(?:grant|revoke)\b/i);
  });
});
