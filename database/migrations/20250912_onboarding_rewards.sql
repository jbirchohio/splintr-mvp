-- Onboarding steps per user
CREATE TABLE IF NOT EXISTS public.user_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  step_code TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, step_code),
  CONSTRAINT user_onboarding_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

ALTER TABLE public.user_onboarding_steps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding_steps' AND policyname='onboarding_owner_select'
  ) THEN
    CREATE POLICY onboarding_owner_select ON public.user_onboarding_steps FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Achievements catalog and user achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id),
  CONSTRAINT user_achievements_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT user_achievements_ach_fk FOREIGN KEY (achievement_id) REFERENCES public.achievements (id) ON DELETE CASCADE
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_achievements' AND policyname='user_achievements_owner_select'
  ) THEN
    CREATE POLICY user_achievements_owner_select ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Daily challenges and progress
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  active_date DATE NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  UNIQUE (code, active_date)
);

CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NULL,
  UNIQUE (user_id, challenge_id),
  CONSTRAINT ucp_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT ucp_ch_fk FOREIGN KEY (challenge_id) REFERENCES public.daily_challenges (id) ON DELETE CASCADE
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_challenges' AND policyname='challenges_read_all'
  ) THEN
    CREATE POLICY challenges_read_all ON public.daily_challenges FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_challenge_progress' AND policyname='ucp_owner_select'
  ) THEN
    CREATE POLICY ucp_owner_select ON public.user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Streaks per user
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_action_date DATE NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT streaks_user_fk FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_streaks' AND policyname='streaks_owner_select'
  ) THEN
    CREATE POLICY streaks_owner_select ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Seed some achievements
INSERT INTO public.achievements (code, name, description, icon, criteria) VALUES
  ('first_story_complete','First Story Complete','Complete your first interactive story','trophy','{"type":"playthroughs","count":1}'),
  ('five_stories','Explorer','Complete five stories','compass','{"type":"playthroughs","count":5}'),
  ('streak_3','On a Roll','Log in or complete a challenge 3 days in a row','fire','{"type":"streak","days":3}')
ON CONFLICT (code) DO NOTHING;

