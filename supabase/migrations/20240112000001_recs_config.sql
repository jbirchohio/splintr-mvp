-- Recommendation configuration (per-variant weights)
CREATE TABLE IF NOT EXISTS recs_config (
  key TEXT NOT NULL,
  variant TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, variant)
);

CREATE INDEX IF NOT EXISTS idx_recs_config_variant ON recs_config(variant) WHERE active = TRUE;

ALTER TABLE recs_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "recs_config_read_all" ON recs_config FOR SELECT USING (true);

-- Seed default weights for variants A and B (optional; safe if re-run)
INSERT INTO recs_config (key, variant, data, active)
VALUES
  ('fyp_weights', 'A', '{
    "freshnessFactor": 0.25,
    "freshnessHours": 72,
    "socialProofFactor": 0.001,
    "socialProofCap": 50,
    "followedBoost": 10,
    "categoryAffinityFactor": 0.5,
    "coldStartJitter": 0.5,
    "cfEnabled": false,
    "cfMaxBoost": 0,
    "diversity": { "perCreatorMax": 2, "perCategoryWindow": 10, "perCategoryMaxInWindow": 5 },
    "completionBoostFactor": 4,
    "velocityViewFactor": 0.01,
    "velocityLikeFactor": 0.2,
    "velocityCompleteFactor": 0.3,
    "authorityFollowerFactor": 0.001,
    "authorityCompletionFactor": 2
  }'::jsonb, TRUE),
  ('fyp_weights', 'B', '{
    "freshnessFactor": 0.25,
    "freshnessHours": 72,
    "socialProofFactor": 0.001,
    "socialProofCap": 50,
    "followedBoost": 10,
    "categoryAffinityFactor": 0.5,
    "coldStartJitter": 0.4,
    "cfEnabled": true,
    "cfMaxBoost": 6,
    "diversity": { "perCreatorMax": 2, "perCategoryWindow": 10, "perCategoryMaxInWindow": 5 },
    "completionBoostFactor": 4,
    "velocityViewFactor": 0.01,
    "velocityLikeFactor": 0.2,
    "velocityCompleteFactor": 0.3,
    "authorityFollowerFactor": 0.001,
    "authorityCompletionFactor": 2
  }'::jsonb, TRUE)
ON CONFLICT (key, variant) DO NOTHING;
