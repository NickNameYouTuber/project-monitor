ALTER TABLE task_columns ADD COLUMN IF NOT EXISTS color VARCHAR(255);
UPDATE task_columns SET color = '#6366f1' WHERE color IS NULL;
