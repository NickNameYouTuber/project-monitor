-- Pipelines core tables
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  commit_sha TEXT,
  ref TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  triggered_by_user_id TEXT,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id UUID PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT,
  image TEXT NOT NULL,
  script TEXT NOT NULL,
  env_json TEXT,
  needs_json TEXT,
  status TEXT NOT NULL,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  exit_code INTEGER,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pipeline_log_chunks (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_artifacts (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  size INTEGER,
  content_path TEXT NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runners (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  tags_json TEXT,
  last_seen_at TIMESTAMP
);


