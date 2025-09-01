CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY,
    url VARCHAR(512) NOT NULL,
    secret VARCHAR(255) NULL,
    events VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks(events);
