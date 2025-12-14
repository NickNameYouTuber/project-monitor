ALTER TABLE whiteboard_elements ADD COLUMN task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_task ON whiteboard_elements(task_id);
