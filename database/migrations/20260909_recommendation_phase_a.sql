-- Phase A recommendation observability for issue #1.
-- These fields allow every served item to be traced back to the ranker and
-- candidate sources that produced it. ALTER TABLE IF EXISTS keeps local/test
-- environments that do not yet include feed_exposures from failing migration.

ALTER TABLE IF EXISTS public.feed_exposures
  ADD COLUMN IF NOT EXISTS candidate_source text,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS served_score double precision,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_feed_exposures_model_version
  ON public.feed_exposures (model_version)
  WHERE model_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feed_exposures_session_created
  ON public.feed_exposures (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

COMMENT ON COLUMN public.feed_exposures.candidate_source IS
  'Comma-separated retrieval sources used for this served recommendation.';
COMMENT ON COLUMN public.feed_exposures.model_version IS
  'Ranker/model version that produced the served recommendation.';
COMMENT ON COLUMN public.feed_exposures.served_score IS
  'Final score at serving time for offline evaluation and debugging.';
COMMENT ON COLUMN public.feed_exposures.metadata IS
  'Extensible recommendation trace payload for experiments and future ML predictions.';
