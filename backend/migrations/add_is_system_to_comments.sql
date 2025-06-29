-- Скрипт для добавления поля is_system в таблицу comments
ALTER TABLE comments ADD COLUMN is_system BOOLEAN DEFAULT FALSE;
