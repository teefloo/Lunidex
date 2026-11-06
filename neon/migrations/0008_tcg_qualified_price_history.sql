-- Comparable TCG price observations. Legacy rows stay untouched because they
-- do not identify printing language, finish, source metric, or quote scope.

begin;

create table if not exists public.tcg_price_history_qualified (
  id bigserial primary key,
  card_id text not null check (char_length(card_id) between 1 and 128),
  set_id text not null check (char_length(set_id) between 1 and 80),
  card_language text not null check (card_language in (
    'en', 'fr', 'es', 'it', 'pt', 'pt-br', 'pt-pt', 'de', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh-tw', 'id', 'th', 'zh-cn'
  )),
  cardmarket_product_id integer not null check (cardmarket_product_id > 0),
  variant text not null check (variant in ('normal', 'holo', 'reverse')),
  market_language_scope text not null default 'aggregate' check (market_language_scope = 'aggregate'),
  condition_scope text not null default 'aggregate' check (condition_scope = 'aggregate'),
  source text not null check (source = 'tcgdex-cardmarket'),
  metric text not null check (metric = 'trend'),
  currency char(3) not null check (currency = 'EUR'),
  value numeric(12, 4) not null check (value > 0),
  source_observed_at timestamptz not null,
  source_day date generated always as ((source_observed_at at time zone 'UTC')::date) stored,
  collected_at timestamptz not null default now(),
  unique (card_id, card_language, cardmarket_product_id, set_id, variant, source, metric, currency, source_day)
);

create index if not exists tcg_price_history_qualified_series_idx
  on public.tcg_price_history_qualified (card_id, card_language, variant, source_day desc);

create index if not exists tcg_price_history_qualified_collected_at_idx
  on public.tcg_price_history_qualified (collected_at);

comment on table public.tcg_price_history_qualified is
  'Qualified daily TCGdex/Cardmarket trend observations; source quotes aggregate market language and card condition.';

commit;
