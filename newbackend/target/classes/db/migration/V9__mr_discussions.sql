CREATE TABLE IF NOT EXISTS merge_request_discussions (
    id UUID PRIMARY KEY,
    merge_request_id UUID NOT NULL REFERENCES merge_requests(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path TEXT NULL,
    line_number INT NULL,
    resolved BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS merge_request_notes (
    id UUID PRIMARY KEY,
    discussion_id UUID NOT NULL REFERENCES merge_request_discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discussions_mr ON merge_request_discussions(merge_request_id);
CREATE INDEX IF NOT EXISTS idx_notes_discussion ON merge_request_notes(discussion_id);


