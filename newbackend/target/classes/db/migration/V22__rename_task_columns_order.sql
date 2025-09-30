-- Переименовываем зарезервированное имя столбца "order" в task_columns
ALTER TABLE task_columns RENAME COLUMN "order" TO order_index;


