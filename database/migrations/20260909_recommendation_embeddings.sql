-- Phase B embedding storage and retrieval for issue #1.
-- Keep embeddings private to server-side recommendation code.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.story_embeddings (
  story_id uuid PRIMARY KEY REFERENCES public.stories(id) ON DELETE CASCADE,
  embedding extensions.vector(384) NOT NULL,
  model text NOT NULL,
  content_hash text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_embeddings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  embedding extensions.vector(384) NOT NULL,
  model text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.story_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_embeddings ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies on purpose. Recommendation reads/writes happen
-- through the server-side service-role client, keeping behavioral vectors private.

CREATE INDEX IF NOT EXISTS story_embeddings_hnsw_cosine_idx
  ON public.story_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_story_embeddings(
  query_embedding extensions.vector(384),
  match_count integer DEFAULT 200,
  exclude_story_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS TABLE (
  story_id uuid,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    se.story_id,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM public.story_embeddings se
  JOIN public.stories s ON s.id = se.story_id
  WHERE s.is_published = true
    AND NOT (se.story_id = ANY(exclude_story_ids))
  ORDER BY se.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 500);
$$;

REVOKE ALL ON FUNCTION public.match_story_embeddings(extensions.vector, integer, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_story_embeddings(extensions.vector, integer, uuid[]) TO service_role;

CREATE INDEX IF NOT EXISTS user_interactions_session_metadata_idx
  ON public.user_interactions USING gin (metadata jsonb_path_ops)
  WHERE metadata IS NOT NULL;
