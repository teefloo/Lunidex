begin;

-- One unlisted, revocable read-only link per custom TCG binder. Only the
-- SHA-256 token hash is stored; quantities and prices remain opt-in.
create table if not exists public.tcg_collection_shares (
  user_id uuid not null references app.users (id) on delete cascade,
  collection_id uuid not null,
  token_hash text not null unique,
  show_quantities boolean not null default false,
  show_prices boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection_id),
  constraint tcg_collection_shares_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.tcg_collection_shares is
  'Owner-controlled unlisted read-only links for one custom TCG binder; stores only token hashes and opt-in fields.';

commit;
