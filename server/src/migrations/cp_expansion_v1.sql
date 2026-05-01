-- Channel Partner Force Multiplier Extension
-- Enabling broker portals and automated link tracking

ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS referral_slug TEXT UNIQUE;
ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS portal_settings JSONB DEFAULT '{}';

-- Index for fast referral lookups
CREATE INDEX IF NOT EXISTS idx_cp_referral ON channel_partners(referral_slug);
