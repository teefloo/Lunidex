-- ============================================================
-- TCG Price History & Alerts
-- Migration: 20260623_tcg_price_history
-- ============================================================

-- ----------------------------------------------------------
-- 1. Price history (append-only, public read)
-- ----------------------------------------------------------
CREATE TABLE tcg_price_history (
  id BIGSERIAL PRIMARY KEY,
  card_id TEXT NOT NULL,              -- e.g. "swsh1-1"
  card_name TEXT NOT NULL,
  set_id TEXT NOT NULL,
  tcgplayer_low NUMERIC(10,2),        -- USD
  tcgplayer_mid NUMERIC(10,2),
  tcgplayer_high NUMERIC(10,2),
  cardmarket_avg NUMERIC(10,2),       -- EUR
  cardmarket_low NUMERIC(10,2),
  cardmarket_trend NUMERIC(10,2),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_history_card_id ON tcg_price_history(card_id, recorded_at DESC);

ALTER TABLE tcg_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read price history"
  ON tcg_price_history FOR SELECT
  USING (true);

-- ----------------------------------------------------------
-- 2. Price alerts (per-user, RLS enforced)
-- ----------------------------------------------------------
CREATE TABLE tcg_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('below', 'above')),
  threshold_usd NUMERIC(10,2),
  threshold_eur NUMERIC(10,2),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR')),
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tcg_price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts"
  ON tcg_price_alerts FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 3. Push subscriptions (per-user, RLS enforced)
-- ----------------------------------------------------------
CREATE TABLE user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,    -- PushSubscription JSON
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX user_push_subscriptions_user_endpoint_unique
  ON user_push_subscriptions (user_id, ((subscription->>'endpoint')));

ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON user_push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
