CREATE TABLE IF NOT EXISTS merge_requests (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_branch VARCHAR(200) NOT NULL,
    target_branch VARCHAR(200) NOT NULL,
    status VARCHAR(32) NOT NULL,
    title VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    merged_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS merge_request_approvals (
    id UUID PRIMARY KEY,
    merge_request_id UUID NOT NULL REFERENCES merge_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mr_repo ON merge_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_mr_approvals_mr ON merge_request_approvals(merge_request_id);


