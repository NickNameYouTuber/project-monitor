CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    source VARCHAR(32) NOT NULL,
    ref VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ NULL,
    finished_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id UUID PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL,
    when_type VARCHAR(32) NOT NULL,
    is_manual BOOLEAN NOT NULL,
    allow_failure BOOLEAN NOT NULL,
    start_after_seconds INT NULL,
    rule_hint TEXT NULL,
    manual_released BOOLEAN NOT NULL,
    timeout_seconds INT NULL,
    env_json TEXT NULL,
    script TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ NULL,
    finished_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_pipeline ON pipeline_jobs(pipeline_id);


