CREATE TABLE IF NOT EXISTS ci_variables (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    key VARCHAR(200) NOT NULL,
    value TEXT NOT NULL,
    masked BOOLEAN NOT NULL,
    protected_branch BOOLEAN NOT NULL,
    scope_pattern VARCHAR(200) NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ci_vars_repo ON ci_variables(repository_id);

CREATE TABLE IF NOT EXISTS pipeline_schedules (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    cron VARCHAR(100) NOT NULL,
    ref VARCHAR(200) NOT NULL,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_repo ON pipeline_schedules(repository_id);


