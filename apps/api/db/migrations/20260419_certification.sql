-- Migration: Add certification tracking to training_progress
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT FALSE;
ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS certified_at TIMESTAMP WITH TIME ZONE;
