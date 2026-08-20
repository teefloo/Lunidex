import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'neon/migrations/0001_lunidex_app.sql'),
  'utf8',
);

describe('Neon lifecycle and collection invariants', () => {
  it('locks account lifecycle state at every mutable application boundary', () => {
    expect(migration).toContain('create or replace function public.require_active_account()');
    for (const trigger of [
      'require_active_account_user_state',
      'require_active_account_profiles',
      'require_active_account_quiz_scores',
      'require_active_account_quiz_attempts',
      'require_active_account_battle_rooms',
      'require_active_account_tcg_price_alerts',
      'require_active_account_user_push_subscriptions',
      'require_active_account_friend_directory',
      'require_active_account_friendships',
      'require_active_account_friend_collection_snapshots',
      'require_active_account_friend_deck_snapshots',
    ]) {
      expect(migration).toContain(`create trigger ${trigger}`);
    }
    expect(migration).toContain('for update;');
    expect(migration).toContain("errcode = 'P0001'");
  });

  it('normalizes profile collection counts and enforces one daily attempt', () => {
    expect(migration).toContain('create or replace function public.distinct_tcg_owned_count(p_cards jsonb)');
    expect(migration).toContain('tcg_owned_count = public.distinct_tcg_owned_count');
    expect(migration).toContain('create unique index if not exists quiz_attempts_user_daily_unique');
    expect(migration).toContain('delete from public.quiz_attempts attempts');
  });
});
