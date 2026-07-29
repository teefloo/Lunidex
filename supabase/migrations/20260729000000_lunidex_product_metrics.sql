create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to service_role;

create table analytics.daily_metrics (
  metric_date date not null,
  event_name text not null check (event_name in ('tcg_start_opened','tcg_set_search_used','tcg_set_selected','tcg_album_opened','tcg_first_value_reached','tcg_activation_completed','tcg_sync_prompt_shown','tcg_sync_prompt_actioned','tcg_returned_after_activation','tcg_activation_error')),
  property_a text not null default '' check (char_length(property_a) <= 32),
  property_b text not null default '' check (char_length(property_b) <= 32),
  total bigint not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (metric_date, event_name, property_a, property_b)
);
alter table analytics.daily_metrics enable row level security;
revoke all on analytics.daily_metrics from public, anon, authenticated;
grant select, insert, update, delete on analytics.daily_metrics to service_role;

create or replace function analytics.increment_daily_metric(p_event_name text, p_property_a text default '', p_property_b text default '') returns void language plpgsql security definer set search_path = analytics, pg_temp as $$
begin
  insert into analytics.daily_metrics (metric_date, event_name, property_a, property_b, total)
  values (current_date, p_event_name, coalesce(p_property_a, ''), coalesce(p_property_b, ''), 1)
  on conflict (metric_date, event_name, property_a, property_b)
  do update set total = analytics.daily_metrics.total + 1, updated_at = now();
end;
$$;
revoke all on function analytics.increment_daily_metric(text, text, text) from public, anon, authenticated;
grant execute on function analytics.increment_daily_metric(text, text, text) to service_role;

create view analytics.weekly_funnel as
select event_name, property_a, property_b, sum(total) as total
from analytics.daily_metrics
where metric_date >= current_date - 6
group by event_name, property_a, property_b;
revoke all on analytics.weekly_funnel from public, anon, authenticated;
grant select on analytics.weekly_funnel to service_role;

do $block$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $sql$
      select cron.schedule('prune-lunidex-product-metrics', '15 3 * * *',
        'delete from analytics.daily_metrics where metric_date < current_date - 90')
    $sql$;
  end if;
end;
$block$;

-- Fallback manual purge when pg_cron is unavailable:
-- delete from analytics.daily_metrics where metric_date < current_date - 90;
