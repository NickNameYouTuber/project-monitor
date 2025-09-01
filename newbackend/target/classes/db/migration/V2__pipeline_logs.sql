CREATE TABLE IF NOT EXISTS pipeline_log_chunks (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    content TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pipeline_log_chunks_job ON pipeline_log_chunks(job_id);


