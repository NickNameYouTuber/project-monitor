CREATE TABLE IF NOT EXISTS dashboard_members (
    id UUID PRIMARY KEY,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dashboard_members_unique ON dashboard_members(dashboard_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_members_user ON dashboard_members(user_id);


