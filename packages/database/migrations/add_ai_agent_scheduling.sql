-- ═══════════════════════════════════════════════════════════════════
-- AI Employee Shift Scheduler & Pacing columns
-- Alters ai_employee_personas to add working hours and dial spacing parameters
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE ai_employee_personas
ADD COLUMN IF NOT EXISTS shift_start_time TIME DEFAULT '10:00:00',
ADD COLUMN IF NOT EXISTS shift_end_time TIME DEFAULT '20:00:00',
ADD COLUMN IF NOT EXISTS cooldown_seconds INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS max_concurrent_calls INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS current_status VARCHAR(50) DEFAULT 'offline';
