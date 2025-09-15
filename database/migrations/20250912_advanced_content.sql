-- Advanced Content Features (11.3)

-- Audio tracks (royalty-free library)
CREATE TABLE IF NOT EXISTS public.audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  public_id TEXT NULL, -- Cloudinary or storage public id
  url TEXT NULL,       -- direct URL if hosted externally
  license TEXT NOT NULL DEFAULT 'royalty_free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER audio_tracks_set_updated_at
BEFORE UPDATE ON public.audio_tracks
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audio_tracks' AND policyname='audio_tracks_read_all'
  ) THEN
    CREATE POLICY audio_tracks_read_all ON public.audio_tracks FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Stickers (overlay assets)
CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  public_id TEXT NOT NULL, -- Cloudinary image (transparent) public id
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER stickers_set_updated_at
BEFORE UPDATE ON public.stickers
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stickers' AND policyname='stickers_read_all'
  ) THEN
    CREATE POLICY stickers_read_all ON public.stickers FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Video effect presets
CREATE TABLE IF NOT EXISTS public.video_effect_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER video_effect_presets_set_updated_at
BEFORE UPDATE ON public.video_effect_presets
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.video_effect_presets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_effect_presets' AND policyname='video_effect_presets_read_all'
  ) THEN
    CREATE POLICY video_effect_presets_read_all ON public.video_effect_presets FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Derived video assets from transformations
CREATE TABLE IF NOT EXISTS public.video_derivatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  derived_public_id TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT video_derivatives_video_fk FOREIGN KEY (video_id) REFERENCES public.videos (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS video_derivatives_video_idx ON public.video_derivatives(video_id);

ALTER TABLE public.video_derivatives ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_derivatives' AND policyname='video_derivatives_owner_read'
  ) THEN
    CREATE POLICY video_derivatives_owner_read ON public.video_derivatives FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.creator_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Story templates
CREATE TABLE IF NOT EXISTS public.story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  template_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER story_templates_set_updated_at
BEFORE UPDATE ON public.story_templates
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='story_templates' AND policyname='story_templates_read_all'
  ) THEN
    CREATE POLICY story_templates_read_all ON public.story_templates FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Seed some defaults
INSERT INTO public.video_effect_presets (code, name, params)
VALUES
  ('sepia', 'Sepia', '{"effects":{"sepia":50}}'),
  ('bw', 'Black & White', '{"effects":{"grayscale":100}}'),
  ('vignette', 'Vignette', '{"effects":{"vignette":30}}'),
  ('bright', 'Brighten', '{"effects":{"brightness":20}}'),
  ('contrast', 'High Contrast', '{"effects":{"contrast":30}}')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, params=EXCLUDED.params, is_active=true;

INSERT INTO public.story_templates (code, name, description, template_data)
VALUES
  ('two_path', 'Two-Path Choice', 'Start with a simple left/right choice and two endings.', '{"nodes":[{"id":"start","isStartNode":true,"isEndNode":false,"choices":[{"id":"c1","text":"Go Left","nextNodeId":"left"},{"id":"c2","text":"Go Right","nextNodeId":"right"}]},{"id":"left","isStartNode":false,"isEndNode":true,"choices":[]},{"id":"right","isStartNode":false,"isEndNode":true,"choices":[]}]}'),
  ('branch_three', 'Three Branches', 'Start leads to three branches then converge to two endings.', '{"nodes":[{"id":"start","isStartNode":true,"isEndNode":false,"choices":[{"id":"c1","text":"Path A","nextNodeId":"a"},{"id":"c2","text":"Path B","nextNodeId":"b"},{"id":"c3","text":"Path C","nextNodeId":"c"}]},{"id":"a","isStartNode":false,"isEndNode":false,"choices":[{"id":"c4","text":"Finish","nextNodeId":"end1"}]},{"id":"b","isStartNode":false,"isEndNode":false,"choices":[{"id":"c5","text":"Finish","nextNodeId":"end2"}]},{"id":"c","isStartNode":false,"isEndNode":false,"choices":[{"id":"c6","text":"Finish","nextNodeId":"end1"}]},{"id":"end1","isStartNode":false,"isEndNode":true,"choices":[]},{"id":"end2","isStartNode":false,"isEndNode":true,"choices":[]}]}')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, template_data=EXCLUDED.template_data, is_active=true;

