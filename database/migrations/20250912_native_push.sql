-- Native push tokens registration for FCM/APNs
CREATE TABLE IF NOT EXISTS public.native_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- ios|android
  token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, token),
  CONSTRAINT native_push_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS native_push_user_idx ON public.native_push_tokens(user_id);
ALTER TABLE public.native_push_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='native_push_tokens' AND policyname='native_push_owner_select'
  ) THEN
    CREATE POLICY native_push_owner_select ON public.native_push_tokens FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

