-- Provider ops: configs, webhook logs, refunds augment

-- Config toggles for providers (test/live etc.)
CREATE TABLE IF NOT EXISTS public.provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'stripe', 'apple', 'google'
  mode TEXT NOT NULL DEFAULT 'test', -- 'test' | 'live'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider)
);

CREATE TRIGGER provider_configs_set_updated_at
BEFORE UPDATE ON public.provider_configs
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Webhook events log (for dashboard/ops)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

-- Augment psp_payments with coins_credited and refunded_coins
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='psp_payments' AND column_name='coins_credited'
  ) THEN
    ALTER TABLE public.psp_payments ADD COLUMN coins_credited BIGINT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='psp_payments' AND column_name='refunded_coins'
  ) THEN
    ALTER TABLE public.psp_payments ADD COLUMN refunded_coins BIGINT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Default provider modes
INSERT INTO public.provider_configs (provider, mode, enabled)
VALUES ('stripe','test', true), ('apple','test', true), ('google','test', true)
ON CONFLICT (provider) DO NOTHING;

