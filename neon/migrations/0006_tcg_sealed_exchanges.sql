-- Additive support for atomic sealed-product exchanges.
-- Existing buy/sell rows keep NULL values in the exchange-give columns.

begin;

alter table public.tcg_sealed_transactions
  drop constraint if exists tcg_sealed_transactions_kind_check;

alter table public.tcg_sealed_transactions
  add column if not exists exchange_give_product_id integer
    references public.tcg_sealed_products (cardmarket_product_id),
  add column if not exists exchange_give_language text,
  add column if not exists exchange_give_quantity integer;

alter table public.tcg_sealed_transactions
  add constraint tcg_sealed_transactions_kind_check
    check (kind in ('buy', 'sell', 'exchange')),
  add constraint tcg_sealed_transactions_exchange_shape_check
    check (
      (
        kind = 'exchange'
        and exchange_give_product_id is not null
        and exchange_give_language in ('unknown', 'en', 'fr', 'es', 'de', 'it', 'ja')
        and exchange_give_quantity is not null
        and exchange_give_quantity > 0
        and unit_price_cents = 0
        and fees_cents = 0
        and shipping_cents = 0
        and discount_cents = 0
        and payment_fees_cents = 0
        and other_costs_cents = 0
      )
      or
      (
        kind in ('buy', 'sell')
        and exchange_give_product_id is null
        and exchange_give_language is null
        and exchange_give_quantity is null
      )
    );

create index if not exists tcg_sealed_transactions_user_exchange_give_idx
  on public.tcg_sealed_transactions (user_id, exchange_give_product_id, date);

commit;
