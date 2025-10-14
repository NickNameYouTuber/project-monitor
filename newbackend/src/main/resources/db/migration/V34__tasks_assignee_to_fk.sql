ALTER TABLE tasks ADD COLUMN assignee_id UUID REFERENCES users(id);

UPDATE tasks SET assignee_id = (
    SELECT id FROM users WHERE LOWER(username) = LOWER(tasks.assignee)
) WHERE assignee IS NOT NULL AND assignee != '';

ALTER TABLE tasks DROP COLUMN assignee;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

