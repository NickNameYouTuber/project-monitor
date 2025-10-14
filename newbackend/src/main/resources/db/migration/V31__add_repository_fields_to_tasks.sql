ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repository_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repository_branch VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_tasks_repository_id ON tasks(repository_id);

