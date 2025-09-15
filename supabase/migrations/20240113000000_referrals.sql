-- Referrals and invite-only scaffolding
CREATE TABLE IF NOT EXISTS referral_codes (
  code TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

CREATE TABLE IF NOT EXISTS referral_attributions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES referral_codes(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_referral CHECK (user_id <> referrer_user_id)
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id, created_at DESC);

-- Optional invite-only codes
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY IF NOT EXISTS "ref_codes_owner_read" ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "ref_codes_owner_insert" ON referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "ref_attr_read_self" ON referral_attributions FOR SELECT USING (auth.uid() = user_id OR auth.uid() = referrer_user_id);
CREATE POLICY IF NOT EXISTS "ref_attr_insert_self" ON referral_attributions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "ref_rewards_read_self" ON referral_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "ref_rewards_insert_system" ON referral_rewards FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "invite_codes_read_all" ON invite_codes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "invite_codes_insert_admin" ON invite_codes FOR INSERT WITH CHECK (true);

