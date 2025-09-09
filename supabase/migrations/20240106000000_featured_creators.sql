-- Create function to get featured creators with their stats
CREATE OR REPLACE FUNCTION get_featured_creators(limit_count INTEGER DEFAULT 6)
RETURNS TABLE (
  creator_id UUID,
  creator_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  story_count BIGINT,
  total_views BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as creator_id,
    u.name as creator_name,
    u.email,
    u.avatar_url,
    u.created_at,
    u.updated_at,
    COALESCE(s.story_count, 0) as story_count,
    COALESCE(s.total_views, 0) as total_views
  FROM users u
  LEFT JOIN (
    SELECT 
      creator_id,
      COUNT(*) as story_count,
      SUM(view_count) as total_views
    FROM stories 
    WHERE is_published = true
    GROUP BY creator_id
  ) s ON u.id = s.creator_id
  WHERE s.story_count > 0  -- Only include creators with published stories
  ORDER BY s.total_views DESC, s.story_count DESC, u.created_at ASC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_featured_creators TO authenticated;

-- Create index to optimize the query
CREATE INDEX IF NOT EXISTS idx_stories_creator_published_views 
ON stories (creator_id, is_published, view_count DESC) 
WHERE is_published = true;