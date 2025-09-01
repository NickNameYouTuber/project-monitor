CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(32) NOT NULL,
    priority VARCHAR(32) NOT NULL,
    assignee VARCHAR(255) NULL,
    "order" INTEGER NULL,
    owner_id VARCHAR(100) NOT NULL REFERENCES users(id),
    dashboard_id UUID NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_dashboard ON projects(dashboard_id);


