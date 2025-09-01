CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    default_branch VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS repository_members (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_repo_members_repo ON repository_members(repository_id);
CREATE INDEX IF NOT EXISTS idx_repo_members_user ON repository_members(user_id);


