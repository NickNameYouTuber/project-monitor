CREATE TABLE IF NOT EXISTS task_columns (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_task_columns_project ON task_columns(project_id);


