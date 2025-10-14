ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

