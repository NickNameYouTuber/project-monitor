-- Добавляет поле reviewer_id в таблицу tasks
ALTER TABLE tasks ADD COLUMN reviewer_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL;

