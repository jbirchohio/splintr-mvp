-- Profile extras: bio and link
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='bio'
  ) THEN
    ALTER TABLE public.users ADD COLUMN bio TEXT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='link_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN link_url TEXT NULL;
  END IF;
END $$;

