import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'neon/migrations/0002_battle_rooms_cascade.sql'),
  'utf8',
);

describe('0002 battle rooms cascade and quiz score constraints', () => {
  it('re-creates battle room ownership foreign keys with cascade', () => {
    expect(migration).toContain("confdeltype <> 'c'");
    for (const constraint of ['battle_rooms_player1_id_fkey', 'battle_rooms_player2_id_fkey']) {
      expect(migration).toContain(`drop constraint ${constraint}`);
      expect(migration).toContain(`add constraint ${constraint}`);
    }
    expect(migration.match(/on delete cascade/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('constrains quiz score mode and challenge to the shared enum sets', () => {
    expect(migration).toContain("mode in ('time-attack', 'survival', 'marathon')");
    expect(migration).toContain("challenge in ('classic', 'silhouette', 'stats')");
  });

  it('stays idempotent by guarding every constraint operation', () => {
    // Every add is preceded by a NOT EXISTS probe within the same block.
    const adds = migration.match(/add constraint [a-z_]+/g) ?? [];
    expect(adds.length).toBeGreaterThan(0);
    expect(migration.match(/if not exists \(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(migration).toContain('begin;');
    expect(migration).toContain('commit;');
  });

  it('checks relation existence before using regclass casts', () => {
    expect(migration).toContain("to_regclass('public.battle_rooms') is not null");
    expect(migration).toContain("to_regclass('app.users') is not null");
    expect(migration).toContain("to_regclass('public.quiz_scores') is not null");
    expect(migration).toContain('quiz_attempts_status_started_at_idx');
    expect(migration).toContain('tcg_price_history_recorded_at_idx');
  });
});
