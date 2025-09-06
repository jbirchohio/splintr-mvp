-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  provider VARCHAR(50) NOT NULL, -- 'google' | 'apple'
  provider_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT users_provider_check CHECK (provider IN ('google', 'apple')),
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100)
);

-- Create videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255),
  duration INTEGER NOT NULL, -- in seconds
  file_size BIGINT NOT NULL, -- in bytes
  cloudinary_public_id VARCHAR(255),
  streaming_url TEXT,
  thumbnail_url TEXT,
  processing_status VARCHAR(20) DEFAULT 'pending',
  moderation_status VARCHAR(20) DEFAULT 'pending',
  moderation_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT videos_duration_check CHECK (duration >= 15 AND duration <= 30),
  CONSTRAINT videos_file_size_check CHECK (file_size > 0 AND file_size <= 104857600), -- 100MB max
  CONSTRAINT videos_processing_status_check CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT videos_moderation_status_check CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'))
);

-- Create stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  story_data JSONB NOT NULL, -- Contains the branching structure
  is_published BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT stories_title_length CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 200),
  CONSTRAINT stories_view_count_check CHECK (view_count >= 0),
  CONSTRAINT stories_published_at_check CHECK (
    (is_published = TRUE AND published_at IS NOT NULL) OR 
    (is_published = FALSE AND published_at IS NULL)
  )
);

-- Create story_playthroughs table
CREATE TABLE story_playthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  path_taken JSONB NOT NULL, -- Array of node IDs taken
  completed_at TIMESTAMP WITH TIME ZONE,
  session_id VARCHAR(255), -- For anonymous tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT story_playthroughs_path_check CHECK (jsonb_typeof(path_taken) = 'array'),
  CONSTRAINT story_playthroughs_session_check CHECK (
    (viewer_id IS NOT NULL) OR (session_id IS NOT NULL)
  )
);

-- Create content_flags table
CREATE TABLE content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(20) NOT NULL, -- 'story' | 'video'
  content_id UUID NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'reviewed' | 'dismissed'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT content_flags_type_check CHECK (content_type IN ('story', 'video')),
  CONSTRAINT content_flags_status_check CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  CONSTRAINT content_flags_reason_length CHECK (LENGTH(reason) >= 1 AND LENGTH(reason) <= 100),
  CONSTRAINT content_flags_reviewed_check CHECK (
    (status = 'pending' AND reviewed_at IS NULL) OR 
    (status IN ('reviewed', 'dismissed') AND reviewed_at IS NOT NULL)
  )
);

-- Create indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_videos_creator_id ON videos(creator_id);
CREATE INDEX idx_videos_processing_status ON videos(processing_status);
CREATE INDEX idx_videos_moderation_status ON videos(moderation_status);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);

CREATE INDEX idx_stories_creator_id ON stories(creator_id);
CREATE INDEX idx_stories_is_published ON stories(is_published);
CREATE INDEX idx_stories_published_at ON stories(published_at DESC) WHERE is_published = TRUE;
CREATE INDEX idx_stories_view_count ON stories(view_count DESC) WHERE is_published = TRUE;
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);

CREATE INDEX idx_story_playthroughs_story_id ON story_playthroughs(story_id);
CREATE INDEX idx_story_playthroughs_viewer_id ON story_playthroughs(viewer_id);
CREATE INDEX idx_story_playthroughs_session_id ON story_playthroughs(session_id);
CREATE INDEX idx_story_playthroughs_created_at ON story_playthroughs(created_at DESC);

CREATE INDEX idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX idx_content_flags_reporter_id ON content_flags(reporter_id);
CREATE INDEX idx_content_flags_status ON content_flags(status);
CREATE INDEX idx_content_flags_created_at ON content_flags(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set published_at when is_published becomes true
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_published = TRUE AND OLD.is_published = FALSE THEN
        NEW.published_at = NOW();
    ELSIF NEW.is_published = FALSE THEN
        NEW.published_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_stories_published_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW EXECUTE FUNCTION set_published_at();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_story_view_count(story_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE stories 
    SET view_count = view_count + 1 
    WHERE id = story_uuid AND is_published = TRUE;
END;
$$ language 'plpgsql';