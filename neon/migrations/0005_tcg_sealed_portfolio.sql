-- Account-backed Pokémon sealed-product portfolio.
--
-- Cardmarket catalogue and prices are global source data. Transactions and
-- derived portfolio data are private and always carry the authenticated
-- account id; the API remains the authorization boundary for this schema.

begin;

create table if not exists public.tcg_sealed_products (
  cardmarket_product_id integer primary key check (cardmarket_product_id > 0),
  name text not null check (char_length(name) between 1 and 1000),
  category_id integer not null check (category_id > 0),
  category_name text not null check (char_length(category_name) between 1 and 200),
  expansion_id integer not null check (expansion_id >= 0),
  cardmarket_url text not null,
  image_available boolean not null default true,
  source_at timestamptz not null,
  updated_at timestamptz not null default now(),
  active boolean not null default true
);

create index if not exists tcg_sealed_products_name_idx
  on public.tcg_sealed_products (lower(name) text_pattern_ops);
create index if not exists tcg_sealed_products_category_idx
  on public.tcg_sealed_products (category_id);
create index if not exists tcg_sealed_products_expansion_idx
  on public.tcg_sealed_products (expansion_id);

create table if not exists public.tcg_sealed_price_snapshots (
  cardmarket_product_id integer not null
    references public.tcg_sealed_products (cardmarket_product_id) on delete cascade,
  day date not null,
  source_at timestamptz not null,
  fetched_at timestamptz not null,
  avg_cents bigint check (avg_cents is null or avg_cents >= 0),
  low_cents bigint check (low_cents is null or low_cents >= 0),
  trend_cents bigint check (trend_cents is null or trend_cents >= 0),
  avg1_cents bigint check (avg1_cents is null or avg1_cents >= 0),
  avg7_cents bigint check (avg7_cents is null or avg7_cents >= 0),
  avg30_cents bigint check (avg30_cents is null or avg30_cents >= 0),
  primary key (cardmarket_product_id, day),
  unique (cardmarket_product_id, source_at)
);

create index if not exists tcg_sealed_price_snapshots_day_idx
  on public.tcg_sealed_price_snapshots (day);
create index if not exists tcg_sealed_price_snapshots_product_day_idx
  on public.tcg_sealed_price_snapshots (cardmarket_product_id, day desc);

create table if not exists public.tcg_sealed_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'failed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object')
);

create index if not exists tcg_sealed_sync_runs_started_idx
  on public.tcg_sealed_sync_runs (started_at desc);

create table if not exists public.tcg_sealed_settings (
  key text primary key check (char_length(key) between 1 and 100),
  value jsonb not null
);

create table if not exists public.tcg_sealed_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  cardmarket_product_id integer not null
    references public.tcg_sealed_products (cardmarket_product_id),
  date date not null,
  revision integer not null default 1 check (revision > 0),
  kind text not null check (kind in ('buy', 'sell')),
  language text not null default 'unknown'
    check (language in ('unknown', 'en', 'fr', 'es', 'de', 'it', 'ja')),
  quantity integer not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  fees_cents bigint not null default 0 check (fees_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  payment_fees_cents bigint not null default 0 check (payment_fees_cents >= 0),
  other_costs_cents bigint not null default 0 check (other_costs_cents >= 0),
  platform text not null default '' check (char_length(platform) <= 512),
  counterparty text not null default '' check (char_length(counterparty) <= 512),
  notes text not null default '' check (char_length(notes) <= 4000),
  storage text not null default '' check (char_length(storage) <= 512),
  allocation_method text not null default 'fifo'
    check (allocation_method in ('fifo', 'manual')),
  selections jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selections) = 'array'),
  voided boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.tcg_sealed_user_revisions (
  user_id uuid primary key references app.users (id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists tcg_sealed_transactions_user_date_idx
  on public.tcg_sealed_transactions (user_id, date, created_at, id);
create index if not exists tcg_sealed_transactions_user_product_idx
  on public.tcg_sealed_transactions (user_id, cardmarket_product_id, date);
create index if not exists tcg_sealed_user_revisions_updated_idx
  on public.tcg_sealed_user_revisions (updated_at desc);

create table if not exists public.tcg_sealed_allocations (
  user_id uuid not null references app.users (id) on delete cascade,
  sale_id uuid not null,
  lot_id uuid not null,
  quantity integer not null check (quantity > 0),
  cost_cents bigint not null check (cost_cents >= 0),
  holding_days numeric(12, 3) not null check (holding_days >= 0),
  primary key (sale_id, lot_id),
  foreign key (sale_id, user_id)
    references public.tcg_sealed_transactions (id, user_id) on delete cascade,
  foreign key (lot_id, user_id)
    references public.tcg_sealed_transactions (id, user_id) on delete restrict
);

create index if not exists tcg_sealed_allocations_user_idx
  on public.tcg_sealed_allocations (user_id);
create index if not exists tcg_sealed_allocations_lot_idx
  on public.tcg_sealed_allocations (lot_id);

create table if not exists public.tcg_sealed_aliases (
  user_id uuid not null references app.users (id) on delete cascade,
  cardmarket_product_id integer not null
    references public.tcg_sealed_products (cardmarket_product_id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 512),
  updated_at timestamptz not null default now(),
  primary key (user_id, cardmarket_product_id)
);

create index if not exists tcg_sealed_aliases_user_alias_idx
  on public.tcg_sealed_aliases (user_id, lower(alias));

create table if not exists public.tcg_sealed_audit (
  id bigserial primary key,
  user_id uuid not null references app.users (id) on delete cascade,
  transaction_id uuid references public.tcg_sealed_transactions (id) on delete set null,
  action text not null check (action in ('create', 'update', 'void')),
  at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

create index if not exists tcg_sealed_audit_user_at_idx
  on public.tcg_sealed_audit (user_id, at desc);

create table if not exists public.tcg_sealed_portfolio_daily (
  user_id uuid not null references app.users (id) on delete cascade,
  day date not null,
  transaction_revision integer not null check (transaction_revision >= 0),
  price_revision integer not null check (price_revision >= 0),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  primary key (user_id, day)
);

create index if not exists tcg_sealed_portfolio_daily_user_day_idx
  on public.tcg_sealed_portfolio_daily (user_id, day desc);

drop trigger if exists tcg_sealed_transactions_set_updated_at on public.tcg_sealed_transactions;
create trigger tcg_sealed_transactions_set_updated_at
before update on public.tcg_sealed_transactions
for each row execute function public.set_updated_at();

drop trigger if exists tcg_sealed_user_revisions_set_updated_at on public.tcg_sealed_user_revisions;
create trigger tcg_sealed_user_revisions_set_updated_at
before update on public.tcg_sealed_user_revisions
for each row execute function public.set_updated_at();

drop trigger if exists tcg_sealed_aliases_set_updated_at on public.tcg_sealed_aliases;
create trigger tcg_sealed_aliases_set_updated_at
before update on public.tcg_sealed_aliases
for each row execute function public.set_updated_at();

drop trigger if exists require_active_account_tcg_sealed_transactions on public.tcg_sealed_transactions;
create trigger require_active_account_tcg_sealed_transactions
before insert or update on public.tcg_sealed_transactions
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_user_revisions on public.tcg_sealed_user_revisions;
create trigger require_active_account_tcg_sealed_user_revisions
before insert or update on public.tcg_sealed_user_revisions
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_allocations on public.tcg_sealed_allocations;
create trigger require_active_account_tcg_sealed_allocations
before insert or update on public.tcg_sealed_allocations
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_aliases on public.tcg_sealed_aliases;
create trigger require_active_account_tcg_sealed_aliases
before insert or update on public.tcg_sealed_aliases
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_audit on public.tcg_sealed_audit;
create trigger require_active_account_tcg_sealed_audit
before insert or update on public.tcg_sealed_audit
for each row execute function public.require_active_account('user_id');

drop trigger if exists require_active_account_tcg_sealed_portfolio_daily on public.tcg_sealed_portfolio_daily;
create trigger require_active_account_tcg_sealed_portfolio_daily
before insert or update on public.tcg_sealed_portfolio_daily
for each row execute function public.require_active_account('user_id');

commit;
