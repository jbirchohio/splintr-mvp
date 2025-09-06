-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_playthroughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can view other users' public profile info (for creator attribution)
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true);

-- Videos table policies
-- Users can view their own videos
CREATE POLICY "Users can view own videos" ON videos
    FOR SELECT USING (auth.uid()::text = creator_id::text);

-- Users can insert their own videos
CREATE POLICY "Users can insert own videos" ON videos
    FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);

-- Users can update their own videos
CREATE POLICY "Users can update own videos" ON videos
    FOR UPDATE USING (auth.uid()::text = creator_id::text);

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON videos
    FOR DELETE USING (auth.uid()::text = creator_id::text);

-- Stories table policies
-- Anyone can view published stories
CREATE POLICY "Anyone can view published stories" ON stories
    FOR SELECT USING (is_published = true);

-- Users can view their own stories (published or unpublished)
CREATE POLICY "Users can view own stories" ON stories
    FOR SELECT USING (auth.uid()::text = creator_id::text);

-- Users can insert their own stories
CREATE POLICY "Users can insert own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);

-- Users can update their own stories
CREATE POLICY "Users can update own stories" ON stories
    FOR UPDATE USING (auth.uid()::text = creator_id::text);

-- Users can delete their own stories
CREATE POLICY "Users can delete own stories" ON stories
    FOR DELETE USING (auth.uid()::text = creator_id::text);

-- Story playthroughs table policies
-- Users can view their own playthroughs
CREATE POLICY "Users can view own playthroughs" ON story_playthroughs
    FOR SELECT USING (
        auth.uid()::text = viewer_id::text OR 
        session_id IS NOT NULL
    );

-- Users can insert their own playthroughs
CREATE POLICY "Users can insert own playthroughs" ON story_playthroughs
    FOR INSERT WITH CHECK (
        auth.uid()::text = viewer_id::text OR 
        (viewer_id IS NULL AND session_id IS NOT NULL)
    );

-- Story creators can view playthroughs of their stories (for analytics)
CREATE POLICY "Creators can view story playthroughs" ON story_playthroughs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = story_playthroughs.story_id 
            AND stories.creator_id::text = auth.uid()::text
        )
    );

-- Content flags table policies
-- Users can view flags they created
CREATE POLICY "Users can view own flags" ON content_flags
    FOR SELECT USING (auth.uid()::text = reporter_id::text);

-- Users can create content flags
CREATE POLICY "Users can create content flags" ON content_flags
    FOR INSERT WITH CHECK (auth.uid()::text = reporter_id::text);

-- Content creators can view flags on their content
CREATE POLICY "Creators can view flags on their content" ON content_flags
    FOR SELECT USING (
        (content_type = 'story' AND EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id::text = content_flags.content_id::text 
            AND stories.creator_id::text = auth.uid()::text
        )) OR
        (content_type = 'video' AND EXISTS (
            SELECT 1 FROM videos 
            WHERE videos.id::text = content_flags.content_id::text 
            AND videos.creator_id::text = auth.uid()::text
        ))
    );

-- Create function to handle user creation from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, name, provider, provider_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        COALESCE(NEW.raw_user_meta_data->>'sub', NEW.id::text)
    );
    RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates from auth
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
    UPDATE public.users
    SET 
        email = NEW.email,
        name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', name),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create trigger to automatically update user profile
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();