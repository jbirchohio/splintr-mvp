-- Seed data for development and testing
-- This file contains sample data to help with development

-- Insert sample users (these would normally be created via auth)
INSERT INTO users (id, email, name, provider, provider_id, avatar_url) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'alice@example.com', 'Alice Creator', 'google', 'google_123456', 'https://example.com/avatars/alice.jpg'),
    ('550e8400-e29b-41d4-a716-446655440002', 'bob@example.com', 'Bob Storyteller', 'apple', 'apple_789012', 'https://example.com/avatars/bob.jpg'),
    ('550e8400-e29b-41d4-a716-446655440003', 'charlie@example.com', 'Charlie Viewer', 'google', 'google_345678', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert sample videos
INSERT INTO videos (id, creator_id, original_filename, duration, file_size, processing_status, moderation_status, streaming_url, thumbnail_url) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'intro.mp4', 20, 5242880, 'completed', 'approved', 'https://example.com/videos/intro.m3u8', 'https://example.com/thumbnails/intro.jpg'),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'choice_a.mp4', 18, 4718592, 'completed', 'approved', 'https://example.com/videos/choice_a.m3u8', 'https://example.com/thumbnails/choice_a.jpg'),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'choice_b.mp4', 22, 5767168, 'completed', 'approved', 'https://example.com/videos/choice_b.m3u8', 'https://example.com/thumbnails/choice_b.jpg'),
    ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'ending_1.mp4', 25, 6291456, 'completed', 'approved', 'https://example.com/videos/ending_1.m3u8', 'https://example.com/thumbnails/ending_1.jpg'),
    ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'ending_2.mp4', 19, 4980736, 'completed', 'approved', 'https://example.com/videos/ending_2.m3u8', 'https://example.com/thumbnails/ending_2.jpg'),
    ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'bob_intro.mp4', 16, 4194304, 'completed', 'approved', 'https://example.com/videos/bob_intro.m3u8', 'https://example.com/thumbnails/bob_intro.jpg')
ON CONFLICT (id) DO NOTHING;

-- Insert sample stories with branching structure
INSERT INTO stories (id, creator_id, title, description, story_data, is_published, thumbnail_url, view_count, published_at) VALUES
    (
        '770e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440001',
        'The Mysterious Door',
        'A thrilling adventure where you choose your path through a mysterious mansion.',
        '{
            "nodes": [
                {
                    "id": "start",
                    "videoId": "660e8400-e29b-41d4-a716-446655440001",
                    "choices": [
                        {
                            "id": "choice_1",
                            "text": "Open the red door",
                            "nextNodeId": "red_path"
                        },
                        {
                            "id": "choice_2",
                            "text": "Open the blue door",
                            "nextNodeId": "blue_path"
                        }
                    ],
                    "isStartNode": true,
                    "isEndNode": false
                },
                {
                    "id": "red_path",
                    "videoId": "660e8400-e29b-41d4-a716-446655440002",
                    "choices": [],
                    "isStartNode": false,
                    "isEndNode": true
                },
                {
                    "id": "blue_path",
                    "videoId": "660e8400-e29b-41d4-a716-446655440003",
                    "choices": [],
                    "isStartNode": false,
                    "isEndNode": true
                }
            ]
        }',
        true,
        'https://example.com/thumbnails/mysterious_door.jpg',
        42,
        NOW() - INTERVAL '2 days'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440002',
        'Bobs Adventure',
        'A simple story by Bob - still in draft.',
        '{
            "nodes": [
                {
                    "id": "start",
                    "videoId": "660e8400-e29b-41d4-a716-446655440006",
                    "choices": [],
                    "isStartNode": true,
                    "isEndNode": true
                }
            ]
        }',
        false,
        NULL,
        0,
        NULL
    )
ON CONFLICT (id) DO NOTHING;

-- Insert sample story playthroughs
INSERT INTO story_playthroughs (story_id, viewer_id, path_taken, completed_at, session_id) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '["start", "red_path"]', NOW() - INTERVAL '1 day', NULL),
    ('770e8400-e29b-41d4-a716-446655440001', NULL, '["start", "blue_path"]', NOW() - INTERVAL '3 hours', 'session_anonymous_123'),
    ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '["start", "blue_path"]', NOW() - INTERVAL '1 hour', NULL)
ON CONFLICT DO NOTHING;

-- Insert sample content flags
INSERT INTO content_flags (content_type, content_id, reporter_id, reason, status, admin_notes, reviewed_at) VALUES
    ('story', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Inappropriate content', 'reviewed', 'Content reviewed and found to be acceptable.', NOW() - INTERVAL '12 hours'),
    ('video', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Copyright violation', 'pending', NULL, NULL)
ON CONFLICT DO NOTHING;