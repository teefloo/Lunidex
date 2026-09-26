-- Public Lunidex API keys, per-account quotas, usage counters, and write
-- idempotency. Secrets are stored only as SHA-256 digests.

begin;

-- Gives every sealed mutation a unique transactional guard. This prevents a
-- stale expected revision from matching the revision written by another call.
alter table public.tcg_sealed_user_revisions
  add column if not exists last_mutation_id uuid;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  key_prefix text not null check (char_length(key_prefix) between 1 and 48),
  key_hash char(64) not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  permission text not null check (permission in ('read', 'read_write')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_active_idx
  on public.api_keys (user_id, created_at desc)
  where revoked_at is null;

drop trigger if exists require_active_account_api_keys on public.api_keys;
create trigger require_active_account_api_keys
before insert or update on public.api_keys
for each row execute function public.require_active_account('user_id');

create table if not exists public.api_quota_buckets (
  subject_key text not null,
  bucket_type text not null check (bucket_type in (
    'read_minute', 'write_minute', 'read_day', 'write_day',
    'cards_day', 'cards_global_day', 'sealed_day', 'sealed_global_day'
  )),
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  limit_count integer not null check (limit_count > 0),
  primary key (subject_key, bucket_type, window_start)
);

create index if not exists api_quota_buckets_window_idx
  on public.api_quota_buckets (window_start);

create table if not exists public.api_usage_daily (
  day date not null,
  api_key_id uuid not null references public.api_keys (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 1 and 100),
  status_family smallint not null check (status_family between 1 and 5),
  request_count integer not null default 0 check (request_count >= 0),
  last_at timestamptz not null default now(),
  primary key (day, api_key_id, endpoint, status_family)
);

create index if not exists api_usage_daily_key_day_idx
  on public.api_usage_daily (api_key_id, day desc);

create table if not exists public.api_idempotency (
  user_id uuid not null references app.users (id) on delete cascade,
  key_hash char(64) not null check (key_hash ~ '^[0-9a-f]{64}$'),
  request_hash char(64) not null check (request_hash ~ '^[0-9a-f]{64}$'),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, key_hash)
);

create index if not exists api_idempotency_expiry_idx
  on public.api_idempotency (expires_at);

drop trigger if exists require_active_account_api_idempotency on public.api_idempotency;
create trigger require_active_account_api_idempotency
before insert or update on public.api_idempotency
for each row execute function public.require_active_account('user_id');

commit;
