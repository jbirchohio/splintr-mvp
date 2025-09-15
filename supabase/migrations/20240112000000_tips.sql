-- Tips (lightweight logging for monetization prototypes)
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tips_story ON tips(story_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_user ON tips(user_id, created_at DESC);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Allow public read (optional; adjust as needed)
CREATE POLICY IF NOT EXISTS "tips_read_all" ON tips FOR SELECT USING (true);

-- Only the authenticated user can insert their own tip
CREATE POLICY IF NOT EXISTS "tips_insert_self"
ON tips FOR INSERT WITH CHECK (auth.uid() = user_id);

