-- Create moderation results table
CREATE TABLE moderation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('text', 'video', 'image')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('approved', 'flagged', 'rejected')),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  categories TEXT[] DEFAULT '{}',
  review_required BOOLEAN DEFAULT FALSE,
  scan_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'aws-rekognition', 'hive')),
  raw_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content flags table
CREATE TABLE content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('story', 'video', 'comment')),
  content_id UUID NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Add moderation status columns to existing tables
ALTER TABLE videos ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'));
ALTER TABLE videos ADD COLUMN IF NOT EXISTS moderation_result_id UUID REFERENCES moderation_results(id);

ALTER TABLE stories ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'));
ALTER TABLE stories ADD COLUMN IF NOT EXISTS moderation_result_id UUID REFERENCES moderation_results(id);

-- Create indexes for performance
CREATE INDEX idx_moderation_results_content ON moderation_results(content_id, content_type);
CREATE INDEX idx_moderation_results_status ON moderation_results(status, review_required);
CREATE INDEX idx_content_flags_status ON content_flags(status, created_at);
CREATE INDEX idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX idx_videos_moderation_status ON videos(moderation_status);
CREATE INDEX idx_stories_moderation_status ON stories(moderation_status);

-- Add RLS policies for moderation tables
ALTER TABLE moderation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

-- Moderation results are only accessible by admins and system
CREATE POLICY "Admins can view all moderation results" ON moderation_results
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Content flags can be created by authenticated users, viewed by admins
CREATE POLICY "Users can create content flags" ON content_flags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own flags" ON content_flags
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view all content flags" ON content_flags
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Function to update moderation status
CREATE OR REPLACE FUNCTION update_content_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the corresponding content table based on moderation result
  IF NEW.content_type = 'video' THEN
    UPDATE videos 
    SET moderation_status = NEW.status, moderation_result_id = NEW.id
    WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'text' AND EXISTS (SELECT 1 FROM stories WHERE id = NEW.content_id) THEN
    UPDATE stories 
    SET moderation_status = NEW.status, moderation_result_id = NEW.id
    WHERE id = NEW.content_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update content moderation status
CREATE TRIGGER update_content_moderation_status_trigger
  AFTER INSERT OR UPDATE ON moderation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_content_moderation_status();