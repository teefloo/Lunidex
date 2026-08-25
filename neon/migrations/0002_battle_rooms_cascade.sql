-- 0002: referential-integrity and constraint hardening follow-ups from the
-- 2026-08 audit. Idempotent and additive; no existing rows are modified.

begin;

-- battle_rooms.player1_id/player2_id were the only user-referencing foreign
-- keys without an ON DELETE action. Application code compensates manually
-- today, but any direct operational cleanup of app.users would fail on these
-- rows. Re-create each constraint with ON DELETE CASCADE only when it does not
-- already cascade, so re-running this migration is a no-op.
do $$
declare
  needs_cascade boolean;
begin
  -- `to_regclass` is deliberately evaluated before any regclass cast. This
  -- keeps the follow-up migration a no-op on a database that has not received
  -- the base schema yet.
  if to_regclass('public.battle_rooms') is not null
     and to_regclass('app.users') is not null then
    select exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player1_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
        and confdeltype <> 'c'
    ) into needs_cascade;
    if needs_cascade then
      alter table public.battle_rooms drop constraint battle_rooms_player1_id_fkey;
      alter table public.battle_rooms
        add constraint battle_rooms_player1_id_fkey
        foreign key (player1_id) references app.users (id) on delete cascade;
    end if;

    select exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player2_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
        and confdeltype <> 'c'
    ) into needs_cascade;
    if needs_cascade then
      alter table public.battle_rooms drop constraint battle_rooms_player2_id_fkey;
      alter table public.battle_rooms
        add constraint battle_rooms_player2_id_fkey
        foreign key (player2_id) references app.users (id) on delete cascade;
    end if;

    -- Fresh deployments that skipped 0001's battle_rooms definition entirely.
    if not exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player1_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
    ) then
      alter table public.battle_rooms
        add constraint battle_rooms_player1_id_fkey
        foreign key (player1_id) references app.users (id) on delete cascade;
    end if;
    if not exists (
      select 1 from pg_constraint
      where conname = 'battle_rooms_player2_id_fkey'
        and conrelid = 'public.battle_rooms'::regclass
    ) then
      alter table public.battle_rooms
        add constraint battle_rooms_player2_id_fkey
        foreign key (player2_id) references app.users (id) on delete cascade;
    end if;
  end if;
end;
$$;

-- quiz_scores.mode/challenge were unconstrained TEXT. Constrain them to the
-- exact value sets shared by src/lib/leaderboard.ts (LEADERBOARD_MODES /
-- LEADERBOARD_CHALLENGES) so new variants require a deliberate migration.
do $$
begin
  if to_regclass('public.quiz_scores') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'quiz_scores_mode_allowed'
        and conrelid = 'public.quiz_scores'::regclass
    ) then
      alter table public.quiz_scores
        add constraint quiz_scores_mode_allowed
        check (mode in ('time-attack', 'survival', 'marathon'));
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'quiz_scores_challenge_allowed'
        and conrelid = 'public.quiz_scores'::regclass
    ) then
      alter table public.quiz_scores
        add constraint quiz_scores_challenge_allowed
        check (challenge in ('classic', 'silhouette', 'stats'));
    end if;
  end if;
end;
$$;

-- Retention jobs filter these columns directly. Keep cleanup bounded when the
-- append-only tables grow beyond the small migrated dataset.
do $$
begin
  if to_regclass('public.quiz_attempts') is not null then
    create index if not exists quiz_attempts_status_started_at_idx
      on public.quiz_attempts (status, started_at);
  end if;
  if to_regclass('public.tcg_price_history') is not null then
    create index if not exists tcg_price_history_recorded_at_idx
      on public.tcg_price_history (recorded_at);
  end if;
end;
$$;

commit;
