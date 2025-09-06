-- Feed optimization migration
-- Create composite indexes for efficient feed queries

-- Composite index for published stories ordered by published_at (main feed query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_feed_main 
ON stories(is_published, published_at DESC) 
WHERE is_published = TRUE;

-- Composite index for creator feed queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_creator_feed 
ON stories(creator_id, is_published, published_at DESC);

-- Index for trending stories (by view count and recency)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_trending 
ON stories(is_published, view_count DESC, published_at DESC) 
WHERE is_published = TRUE;

-- Partial index for recently published stories (last 7 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_recent 
ON stories(published_at DESC) 
WHERE is_published = TRUE AND published_at > (NOW() - INTERVAL '7 days');

-- Create materialized view for feed performance
CREATE MATERIALIZED VIEW feed_items AS
SELECT 
    s.id as story_id,
    s.creator_id,
    u.name as creator_name,
    u.avatar_url as creator_avatar,
    s.title,
    s.description,
    s.thumbnail_url,
    s.view_count,
    s.published_at,
    s.created_at,
    -- Calculate engagement score for ranking
    (s.view_count * 0.7 + 
     EXTRACT(EPOCH FROM (NOW() - s.published_at)) / 3600 * -0.3) as engagement_score
FROM stories s
JOIN users u ON s.creator_id = u.id
WHERE s.is_published = TRUE
ORDER BY s.published_at DESC;

-- Create index on materialized view
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at DESC);
CREATE INDEX idx_feed_items_creator_id ON feed_items(creator_id);
CREATE INDEX idx_feed_items_engagement ON feed_items(engagement_score DESC);

-- Function to refresh feed materialized view
CREATE OR REPLACE FUNCTION refresh_feed_cache()
RETURNS void AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY feed_items;
END;
$ language 'plpgsql';

-- Create function to get paginated feed
CREATE OR REPLACE FUNCTION get_feed_page(
    page_size INTEGER DEFAULT 20,
    cursor_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    feed_type TEXT DEFAULT 'chronological'
)
RETURNS TABLE(
    story_id UUID,
    creator_id UUID,
    creator_name VARCHAR(100),
    creator_avatar TEXT,
    title VARCHAR(200),
    description TEXT,
    thumbnail_url TEXT,
    view_count INTEGER,
    published_at TIMESTAMP WITH TIME ZONE,
    engagement_score NUMERIC
) AS $
BEGIN
    IF feed_type = 'trending' THEN
        RETURN QUERY
        SELECT f.story_id, f.creator_id, f.creator_name, f.creator_avatar,
               f.title, f.description, f.thumbnail_url, f.view_count,
               f.published_at, f.engagement_score
        FROM feed_items f
        WHERE (cursor_timestamp IS NULL OR f.published_at < cursor_timestamp)
        ORDER BY f.engagement_score DESC, f.published_at DESC
        LIMIT page_size;
    ELSE
        -- Default chronological feed
        RETURN QUERY
        SELECT f.story_id, f.creator_id, f.creator_name, f.creator_avatar,
               f.title, f.description, f.thumbnail_url, f.view_count,
               f.published_at, f.engagement_score
        FROM feed_items f
        WHERE (cursor_timestamp IS NULL OR f.published_at < cursor_timestamp)
        ORDER BY f.published_at DESC
        LIMIT page_size;
    END IF;
END;
$ language 'plpgsql';

-- Create function to get creator-specific feed
CREATE OR REPLACE FUNCTION get_creator_feed(
    target_creator_id UUID,
    page_size INTEGER DEFAULT 20,
    cursor_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    story_id UUID,
    creator_id UUID,
    creator_name VARCHAR(100),
    creator_avatar TEXT,
    title VARCHAR(200),
    description TEXT,
    thumbnail_url TEXT,
    view_count INTEGER,
    published_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
    RETURN QUERY
    SELECT f.story_id, f.creator_id, f.creator_name, f.creator_avatar,
           f.title, f.description, f.thumbnail_url, f.view_count,
           f.published_at
    FROM feed_items f
    WHERE f.creator_id = target_creator_id
    AND (cursor_timestamp IS NULL OR f.published_at < cursor_timestamp)
    ORDER BY f.published_at DESC
    LIMIT page_size;
END;
$ language 'plpgsql';

-- Create trigger to refresh feed cache when stories are published
CREATE OR REPLACE FUNCTION trigger_feed_refresh()
RETURNS TRIGGER AS $
BEGIN
    -- Only refresh if story was just published or unpublished
    IF (NEW.is_published != OLD.is_published) OR 
       (NEW.is_published = TRUE AND NEW.view_count != OLD.view_count) THEN
        -- Use pg_notify to signal cache refresh (can be picked up by background job)
        PERFORM pg_notify('feed_refresh', NEW.id::text);
    END IF;
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER stories_feed_refresh_trigger
    AFTER UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION trigger_feed_refresh();

-- Create trigger for new story publications
CREATE OR REPLACE FUNCTION trigger_new_story_feed_refresh()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.is_published = TRUE THEN
        PERFORM pg_notify('feed_refresh', NEW.id::text);
    END IF;
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER new_stories_feed_refresh_trigger
    AFTER INSERT ON stories
    FOR EACH ROW EXECUTE FUNCTION trigger_new_story_feed_refresh();