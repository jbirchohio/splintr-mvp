-- Test queries to validate database schema and constraints
-- Run these after setting up the database to ensure everything works

-- Test 1: Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Test 2: Verify constraints work
-- This should fail due to duration constraint
-- INSERT INTO videos (creator_id, duration, file_size) 
-- VALUES ('550e8400-e29b-41d4-a716-446655440001', 10, 1000000);

-- Test 3: Verify story structure validation
SELECT * FROM validate_story_structure('{
    "nodes": [
        {
            "id": "start",
            "videoId": "test-video-id",
            "choices": [
                {
                    "id": "choice1",
                    "text": "Go left",
                    "nextNodeId": "left"
                }
            ],
            "isStartNode": true,
            "isEndNode": false
        },
        {
            "id": "left",
            "videoId": "test-video-id-2",
            "choices": [],
            "isStartNode": false,
            "isEndNode": true
        }
    ]
}'::jsonb);

-- Test 4: Verify invalid story structure fails validation
SELECT * FROM validate_story_structure('{
    "nodes": [
        {
            "id": "start",
            "videoId": "test-video-id",
            "choices": [
                {
                    "id": "choice1",
                    "text": "Go left",
                    "nextNodeId": "nonexistent"
                }
            ],
            "isStartNode": true,
            "isEndNode": false
        }
    ]
}'::jsonb);

-- Test 5: Verify indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Test 6: Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 7: Verify triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Test 8: Test utility functions
SELECT * FROM get_trending_stories(7, 5);

-- Test 9: Test views
SELECT * FROM published_stories_feed LIMIT 5;
SELECT * FROM story_analytics LIMIT 5;