-- Добавляем поддержку задач в звонках
ALTER TABLE calls ADD COLUMN IF NOT EXISTS task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calls_task ON calls(task_id);
