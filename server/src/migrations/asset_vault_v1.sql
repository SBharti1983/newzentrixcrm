-- Asset Vault Expansion
-- Adding project_id to documents to allow project-level storage (floorplans, RERA, brochures)

ALTER TABLE documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
