-- Recommendation model registry for issue #1 Phase C.
-- Models are server-managed and intentionally have no client policies.

CREATE TABLE IF NOT EXISTS public.recommendation_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  feature_schema_version text NOT NULL,
  intercept double precision NOT NULL DEFAULT 0,
  coefficients jsonb NOT NULL DEFAULT '{}'::jsonb,
  means jsonb NOT NULL DEFAULT '{}'::jsonb,
  scales jsonb NOT NULL DEFAULT '{}'::jsonb,
  training_rows integer NOT NULL DEFAULT 0,
  metrics jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

ALTER TABLE public.recommendation_models ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recommendation_models_active
  ON public.recommendation_models (is_active, activated_at DESC)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.activate_recommendation_model(target_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.recommendation_models
    SET is_active = false
    WHERE is_active = true;

  UPDATE public.recommendation_models
    SET is_active = true,
        activated_at = now()
    WHERE version = target_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recommendation model version % not found', target_version;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_recommendation_model(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_recommendation_model(text) TO service_role;
