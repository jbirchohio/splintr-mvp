-- Story scheduling and monetization flags

ALTER TABLE stories ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS tip_enabled BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_stories_scheduled_publish_at ON stories(scheduled_publish_at) WHERE is_published = FALSE;

