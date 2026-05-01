-- Nurture Auto-Pilot Extension
-- Tracking last automated contact to prevent duplicate messaging

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_auto_pilot_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_leads_reconnect ON leads(reconnect_date, status);
