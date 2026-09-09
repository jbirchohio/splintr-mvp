-- Phase A recommendation observability for issue #1.
-- The guards allow lightweight local/test schemas that do not yet contain
-- feed_exposures to apply the migration without failing.

ALTER TABLE IF EXISTS public.feed_exposures
  ADD COLUMN IF NOT EXISTS candidate_source text,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS served_score double precision,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

DO $$
BEGIN
  IF to_regclass('public.feed_exposures') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feed_exposures_model_version
      ON public.feed_exposures (model_version)
      WHERE model_version IS NOT NULL';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feed_exposures_session_created
      ON public.feed_exposures (session_id, created_at DESC)
      WHERE session_id IS NOT NULL';

    COMMENT ON COLUMN public.feed_exposures.candidate_source IS
      'Comma-separated retrieval sources used for this served recommendation.';
    COMMENT ON COLUMN public.feed_exposures.model_version IS
      'Ranker/model version that produced the served recommendation.';
    COMMENT ON COLUMN public.feed_exposures.served_score IS
      'Final score at serving time for offline evaluation and debugging.';
    COMMENT ON COLUMN public.feed_exposures.metadata IS
      'Extensible recommendation trace payload for experiments and future ML predictions.';
  END IF;
END $$;
