-- Database utility functions and views for Splintr

-- View for published stories with creator information (for feed)
CREATE OR REPLACE VIEW public.published_stories_feed AS
SELECT 
    s.id,
    s.title,
    s.description,
    s.thumbnail_url,
    s.view_count,
    s.published_at,
    s.created_at,
    u.id as creator_id,
    u.name as creator_name,
    u.avatar_url as creator_avatar,
    COALESCE(u.is_verified, false) as creator_verified
FROM stories s
JOIN users u ON s.creator_id = u.id
WHERE s.is_published = true
ORDER BY s.published_at DESC;

-- View for story analytics (for creators)
CREATE OR REPLACE VIEW public.story_analytics AS
SELECT 
    s.id as story_id,
    s.title,
    s.view_count,
    s.published_at,
    COUNT(DISTINCT sp.id) as total_playthroughs,
    COUNT(DISTINCT sp.viewer_id) as unique_viewers,
    COUNT(DISTINCT CASE WHEN sp.completed_at IS NOT NULL THEN sp.id END) as completed_playthroughs,
    ROUND(
        COUNT(DISTINCT CASE WHEN sp.completed_at IS NOT NULL THEN sp.id END)::numeric / 
        NULLIF(COUNT(DISTINCT sp.id), 0) * 100, 2
    ) as completion_rate
FROM stories s
LEFT JOIN story_playthroughs sp ON s.id = sp.story_id
WHERE s.is_published = true
GROUP BY s.id, s.title, s.view_count, s.published_at;

-- Function to validate story structure
CREATE OR REPLACE FUNCTION validate_story_structure(story_data JSONB)
RETURNS TABLE(is_valid BOOLEAN, errors TEXT[]) AS $$
DECLARE
    nodes JSONB;
    node JSONB;
    start_nodes INTEGER := 0;
    node_ids TEXT[] := '{}';
    choice JSONB;
    errors_array TEXT[] := '{}';
BEGIN
    -- Check if story_data has nodes
    IF NOT (story_data ? 'nodes') THEN
        errors_array := array_append(errors_array, 'Story must have nodes array');
        RETURN QUERY SELECT false, errors_array;
        RETURN;
    END IF;
    
    nodes := story_data->'nodes';
    
    -- Check if nodes is an array and not empty
    IF jsonb_typeof(nodes) != 'array' OR jsonb_array_length(nodes) = 0 THEN
        errors_array := array_append(errors_array, 'Nodes must be a non-empty array');
        RETURN QUERY SELECT false, errors_array;
        RETURN;
    END IF;
    
    -- Validate each node
    FOR node IN SELECT * FROM jsonb_array_elements(nodes)
    LOOP
        -- Check required fields
        IF NOT (node ? 'id' AND node ? 'videoId' AND node ? 'choices' AND node ? 'isStartNode' AND node ? 'isEndNode') THEN
            errors_array := array_append(errors_array, 'Each node must have id, videoId, choices, isStartNode, and isEndNode fields');
        END IF;
        
        -- Count start nodes
        IF (node->>'isStartNode')::boolean THEN
            start_nodes := start_nodes + 1;
        END IF;
        
        -- Collect node IDs
        node_ids := array_append(node_ids, node->>'id');
        
        -- Validate choices
        IF jsonb_typeof(node->'choices') != 'array' THEN
            errors_array := array_append(errors_array, 'Node choices must be an array');
        ELSE
            -- Check choice structure
            FOR choice IN SELECT * FROM jsonb_array_elements(node->'choices')
            LOOP
                IF NOT (choice ? 'id' AND choice ? 'text' AND choice ? 'nextNodeId') THEN
                    errors_array := array_append(errors_array, 'Each choice must have id, text, and nextNodeId fields');
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    -- Must have exactly one start node
    IF start_nodes != 1 THEN
        errors_array := array_append(errors_array, 'Story must have exactly one start node');
    END IF;
    
    -- Validate choice references
    FOR node IN SELECT * FROM jsonb_array_elements(nodes)
    LOOP
        FOR choice IN SELECT * FROM jsonb_array_elements(node->'choices')
        LOOP
            IF choice->>'nextNodeId' IS NOT NULL AND NOT (choice->>'nextNodeId' = ANY(node_ids)) THEN
                errors_array := array_append(errors_array, 'Choice references non-existent node: ' || (choice->>'nextNodeId'));
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT (array_length(errors_array, 1) IS NULL), errors_array;
END;
$$ LANGUAGE plpgsql;

-- Function to get story path statistics
CREATE OR REPLACE FUNCTION get_story_path_stats(story_uuid UUID)
RETURNS TABLE(
    path_signature TEXT,
    path_count BIGINT,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        array_to_string(
            ARRAY(SELECT jsonb_array_elements_text(sp.path_taken)), 
            ' -> '
        ) as path_signature,
        COUNT(*) as path_count,
        ROUND(
            COUNT(CASE WHEN sp.completed_at IS NOT NULL THEN 1 END)::numeric / 
            COUNT(*)::numeric * 100, 2
        ) as completion_rate
    FROM story_playthroughs sp
    WHERE sp.story_id = story_uuid
    GROUP BY path_signature
    ORDER BY path_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old anonymous playthroughs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_playthroughs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM story_playthroughs 
    WHERE viewer_id IS NULL 
    AND session_id IS NOT NULL 
    AND created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending stories (based on recent views)
CREATE OR REPLACE FUNCTION get_trending_stories(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    story_id UUID,
    title VARCHAR(200),
    creator_name VARCHAR(100),
    creator_avatar TEXT,
    thumbnail_url TEXT,
    recent_views BIGINT,
    total_views INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        u.name,
        u.avatar_url,
        s.thumbnail_url,
        COUNT(sp.id) as recent_views,
        s.view_count as total_views
    FROM stories s
    JOIN users u ON s.creator_id = u.id
    LEFT JOIN story_playthroughs sp ON s.id = sp.story_id 
        AND sp.created_at > NOW() - INTERVAL '1 day' * days_back
    WHERE s.is_published = true
    GROUP BY s.id, s.title, u.name, u.avatar_url, s.thumbnail_url, s.view_count
    ORDER BY recent_views DESC, total_views DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
