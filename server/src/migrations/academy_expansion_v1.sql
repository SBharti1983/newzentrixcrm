-- Academy 2.0: Automated Coaching Extension
-- Linking AI performance analysis to training modules

ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS target_skill TEXT;

-- Seed some standard skills for existing modules if any
UPDATE training_modules SET target_skill = 'Closing' WHERE title ILIKE '%closing%';
UPDATE training_modules SET target_skill = 'Rapport' WHERE title ILIKE '%relationship%' OR title ILIKE '%rapport%';
UPDATE training_modules SET target_skill = 'Knowledge' WHERE title ILIKE '%inventory%' OR title ILIKE '%product%';

-- Add a log for automated coaching assignments
CREATE TABLE IF NOT EXISTS academy_coaching_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    detected_weakness TEXT,
    avg_score NUMERIC,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
