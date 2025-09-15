-- Invite redemptions mapping
CREATE TABLE IF NOT EXISTS invite_redemptions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES invite_codes(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invite_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "invite_redemptions_read_self" ON invite_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "invite_redemptions_insert_self" ON invite_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

