CREATE TABLE IF NOT EXISTS runners (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    token_hash TEXT NOT NULL,
    tags TEXT NULL,
    active BOOLEAN NOT NULL,
    last_heartbeat_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_artifacts (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    content_type VARCHAR(200) NOT NULL,
    size_bytes BIGINT NOT NULL,
    path TEXT NOT NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifacts_job ON pipeline_artifacts(job_id);


