-- Creator applications
CREATE TABLE IF NOT EXISTS public.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bio TEXT NOT NULL,
  links TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  reviewed_at TIMESTAMPTZ NULL,
  reviewer_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT creator_app_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TRIGGER creator_app_updated_at
BEFORE UPDATE ON public.creator_applications
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creator_applications' AND policyname='creator_app_owner_select'
  ) THEN
    CREATE POLICY creator_app_owner_select ON public.creator_applications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Influencer partners
CREATE TABLE IF NOT EXISTS public.influencer_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  promo_code TEXT NOT NULL UNIQUE,
  payout_rate_ppm INTEGER NOT NULL DEFAULT 100000, -- 10%
  status TEXT NOT NULL DEFAULT 'active', -- active|paused
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT influencer_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TRIGGER influencer_updated_at
BEFORE UPDATE ON public.influencer_partners
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.influencer_partners ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='influencer_partners' AND policyname='influencer_owner_select'
  ) THEN
    CREATE POLICY influencer_owner_select ON public.influencer_partners FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Content imports
CREATE TABLE IF NOT EXISTS public.content_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- youtube|tiktok|instagram|other
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|completed|failed
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_imports_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TRIGGER content_imports_updated_at
BEFORE UPDATE ON public.content_imports
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.content_imports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_imports' AND policyname='content_imports_owner_select'
  ) THEN
    CREATE POLICY content_imports_owner_select ON public.content_imports FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users: creator flag
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_creator'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_creator BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Notification preferences (for engagement times)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY,
  preferred_hour_start INTEGER NOT NULL DEFAULT 18,
  preferred_hour_end INTEGER NOT NULL DEFAULT 22,
  timezone TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notif_prefs_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_preferences' AND policyname='notif_prefs_owner_select'
  ) THEN
    CREATE POLICY notif_prefs_owner_select ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

