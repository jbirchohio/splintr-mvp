-- Creator Economy: wallets, ledgers, entitlements, payments, payouts
-- This migration scaffolds data structures for section 11.2/11.2A.

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Wallets hold in-app coins for a user
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  coin_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallets_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS wallets_user_idx ON public.wallets(user_id);

CREATE TRIGGER wallets_set_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- General-purpose double-entry ledger
-- Each logical transaction consists of 2+ entries that share tx_id and sum to zero (credits - debits = 0)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id UUID NOT NULL, -- group entries in a single transaction
  account TEXT NOT NULL, -- e.g. 'user_coin_wallet:{uuid}', 'platform_coin_liability', 'creator_earnings:{uuid}'
  user_id UUID NULL, -- optional association for owner accounts
  currency TEXT NOT NULL DEFAULT 'COIN', -- COIN, DIAMOND, USD, etc.
  debit BIGINT NOT NULL DEFAULT 0, -- positive amounts only
  credit BIGINT NOT NULL DEFAULT 0, -- positive amounts only
  reference_type TEXT NULL, -- 'iap' | 'psp' | 'entitlement' | 'payout' | 'adjustment'
  reference_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_tx_idx ON public.ledger_entries(tx_id);
CREATE INDEX IF NOT EXISTS ledger_account_idx ON public.ledger_entries(account);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON public.ledger_entries(user_id);

-- Entitlements: premium content unlocks for users
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  story_id UUID NOT NULL,
  entitlement_type TEXT NOT NULL DEFAULT 'premium_unlock',
  source TEXT NOT NULL DEFAULT 'purchase', -- purchase | gift | admin
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT entitlements_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT entitlements_story_fk FOREIGN KEY (story_id) REFERENCES public.stories (id) ON DELETE CASCADE,
  CONSTRAINT entitlements_unique UNIQUE (user_id, story_id, entitlement_type)
);

CREATE INDEX IF NOT EXISTS entitlements_user_idx ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS entitlements_story_idx ON public.entitlements(story_id);

-- IAP receipts for Apple/Google validation records
CREATE TABLE IF NOT EXISTS public.iap_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'apple' | 'google'
  product_id TEXT NOT NULL,
  receipt_data TEXT NOT NULL, -- base64 for Apple, token for Google
  original_tx_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | validated | invalid | refunded
  purchased_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_response JSONB NULL,
  CONSTRAINT iap_receipts_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TRIGGER iap_receipts_set_updated_at
BEFORE UPDATE ON public.iap_receipts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- PSP (web) payments, e.g., Stripe/Adyen
CREATE TABLE IF NOT EXISTS public.psp_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'stripe' | 'adyen' | etc
  provider_payment_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requires_action', -- requires_action | succeeded | refunded | disputed | failed
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NULL,
  CONSTRAINT psp_payments_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT psp_payments_unique UNIQUE (provider, provider_payment_id)
);

CREATE TRIGGER psp_payments_set_updated_at
BEFORE UPDATE ON public.psp_payments
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Payouts to creators
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- e.g., 'stripe_connect' | 'hyperwallet'
  provider_payout_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | paid | failed
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NULL,
  CONSTRAINT payouts_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS payouts_user_idx ON public.payouts(user_id);

CREATE TRIGGER payouts_set_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Basic RLS (owner read). Writes are performed by server using service role.
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iap_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psp_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- wallets: owner can select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='wallets_owner_select'
  ) THEN
    CREATE POLICY wallets_owner_select ON public.wallets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- entitlements: owner can select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entitlements' AND policyname='entitlements_owner_select'
  ) THEN
    CREATE POLICY entitlements_owner_select ON public.entitlements
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- iap_receipts: owner can select their receipts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='iap_receipts' AND policyname='iap_owner_select'
  ) THEN
    CREATE POLICY iap_owner_select ON public.iap_receipts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- psp_payments: owner can select their payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='psp_payments' AND policyname='psp_owner_select'
  ) THEN
    CREATE POLICY psp_owner_select ON public.psp_payments
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- payouts: owner can select their payouts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payouts' AND policyname='payouts_owner_select'
  ) THEN
    CREATE POLICY payouts_owner_select ON public.payouts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Story premium flag for entitlement gating
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stories' AND column_name='is_premium'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Verification badge for users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_verified'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Gifts catalog and transactions
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g., 'ROSE', 'DIAMOND_HEART'
  name TEXT NOT NULL,
  price_coins BIGINT NOT NULL,
  diamond_value BIGINT NOT NULL, -- diamonds credited to creator
  image_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER gifts_set_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  story_id UUID NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  coins_spent BIGINT NOT NULL,
  diamonds_earned BIGINT NOT NULL,
  platform_fee_ppm INTEGER NOT NULL DEFAULT 200000, -- 20% in ppm
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gift_tx_gift_fk FOREIGN KEY (gift_id) REFERENCES public.gifts (id),
  CONSTRAINT gift_tx_sender_fk FOREIGN KEY (sender_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT gift_tx_creator_fk FOREIGN KEY (creator_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT gift_tx_story_fk FOREIGN KEY (story_id) REFERENCES public.stories (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS gift_tx_sender_idx ON public.gift_transactions(sender_id);
CREATE INDEX IF NOT EXISTS gift_tx_creator_idx ON public.gift_transactions(creator_id);

-- Conversion rates (e.g., COIN->DIAMOND, DIAMOND->USD)
CREATE TABLE IF NOT EXISTS public.conversion_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  rate NUMERIC(20,8) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_unit, to_unit)
);

-- Creator payout accounts (Stripe Connect)
CREATE TABLE IF NOT EXISTS public.creator_accounts (
  user_id UUID PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe_connect',
  provider_account_id TEXT NOT NULL, -- stripe account id
  requirements_due BOOLEAN NOT NULL DEFAULT true,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT creator_accounts_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TRIGGER creator_accounts_set_updated_at
BEFORE UPDATE ON public.creator_accounts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS policies
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- gifts readable by anyone
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gifts' AND policyname='gifts_read_all'
  ) THEN
    CREATE POLICY gifts_read_all ON public.gifts FOR SELECT USING (true);
  END IF;

  -- gift tx readable by sender or creator
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gift_transactions' AND policyname='gift_tx_read_own'
  ) THEN
    CREATE POLICY gift_tx_read_own ON public.gift_transactions FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = creator_id);
  END IF;

  -- conversion rates readable by anyone
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversion_rates' AND policyname='conversion_rates_read_all'
  ) THEN
    CREATE POLICY conversion_rates_read_all ON public.conversion_rates FOR SELECT USING (true);
  END IF;

  -- creator accounts readable by owner
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creator_accounts' AND policyname='creator_accounts_owner_select'
  ) THEN
    CREATE POLICY creator_accounts_owner_select ON public.creator_accounts FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Seed defaults (idempotent upserts)
INSERT INTO public.conversion_rates (from_unit, to_unit, rate) VALUES
  ('COIN','DIAMOND', 0.01),
  ('DIAMOND','USD', 0.005)
ON CONFLICT (from_unit, to_unit) DO UPDATE SET rate = EXCLUDED.rate;

INSERT INTO public.gifts (code, name, price_coins, diamond_value, image_url) VALUES
  ('ROSE','Rose', 100, 1, NULL),
  ('HEART','Heart', 500, 6, NULL),
  ('GEM','Gem', 1000, 13, NULL),
  ('METEOR','Meteor', 5000, 75, NULL)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, price_coins=EXCLUDED.price_coins, diamond_value=EXCLUDED.diamond_value, image_url=EXCLUDED.image_url, is_active=true;

-- Brand partnership marketplace
CREATE TABLE IF NOT EXISTS public.brand_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  budget_usd_cents BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER brand_campaigns_set_updated_at
BEFORE UPDATE ON public.brand_campaigns
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.brand_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  message TEXT NULL,
  status TEXT NOT NULL DEFAULT 'applied', -- applied | accepted | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT brand_app_campaign_fk FOREIGN KEY (campaign_id) REFERENCES public.brand_campaigns (id) ON DELETE CASCADE,
  CONSTRAINT brand_app_creator_fk FOREIGN KEY (creator_id) REFERENCES public.users (id) ON DELETE CASCADE,
  UNIQUE (campaign_id, creator_id)
);

ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_campaigns' AND policyname='brand_campaigns_read_all'
  ) THEN
    CREATE POLICY brand_campaigns_read_all ON public.brand_campaigns FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_applications' AND policyname='brand_applications_owner_read'
  ) THEN
    CREATE POLICY brand_applications_owner_read ON public.brand_applications FOR SELECT USING (auth.uid() = creator_id);
  END IF;
END $$;

-- Gift analytics view per creator
CREATE OR REPLACE VIEW public.gift_analytics AS
SELECT 
  gt.creator_id,
  DATE_TRUNC('week', gt.created_at) as week,
  COUNT(*) as gifts_count,
  SUM(gt.quantity) as total_quantity,
  SUM(gt.coins_spent) as coins_spent,
  SUM(gt.diamonds_earned) as diamonds_earned
FROM gift_transactions gt
GROUP BY gt.creator_id, DATE_TRUNC('week', gt.created_at);
