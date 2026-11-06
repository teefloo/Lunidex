-- Tracks only recently requested card/language pairs for bounded daily refresh.
-- It intentionally stores no account, session, IP, or other user identifier.

begin;

create table if not exists public.tcg_price_history_refresh_targets (
  card_id text not null check (char_length(card_id) between 1 and 128),
  card_language text not null check (card_language in (
    'en', 'fr', 'es', 'it', 'pt', 'pt-br', 'pt-pt', 'de', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh-tw', 'id', 'th', 'zh-cn'
  )),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  primary key (card_id, card_language)
);

create index if not exists tcg_price_history_refresh_targets_due_idx
  on public.tcg_price_history_refresh_targets (last_checked_at asc nulls first, last_seen_at desc, card_id, card_language);

create index if not exists tcg_price_history_refresh_targets_seen_idx
  on public.tcg_price_history_refresh_targets (last_seen_at);

comment on table public.tcg_price_history_refresh_targets is
  'Recently consulted localized card IDs for the capped daily TCGdex/Cardmarket price refresh; contains no user identity.';

commit;
