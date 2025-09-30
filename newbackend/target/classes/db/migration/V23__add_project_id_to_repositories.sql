ALTER TABLE repositories ADD COLUMN IF NOT EXISTS project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_repositories_project ON repositories(project_id);


