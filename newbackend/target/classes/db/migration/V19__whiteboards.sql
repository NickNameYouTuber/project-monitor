CREATE TABLE IF NOT EXISTS whiteboards (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whiteboards_project ON whiteboards(project_id);

CREATE TABLE IF NOT EXISTS whiteboard_elements (
    id UUID PRIMARY KEY,
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL DEFAULT 'sticky',
    x INTEGER NOT NULL DEFAULT 0,
    y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 160,
    height INTEGER NOT NULL DEFAULT 120,
    rotation INTEGER NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 0,
    text TEXT NULL,
    fill VARCHAR(32) NULL,
    text_color VARCHAR(32) NULL,
    font_family VARCHAR(64) NULL,
    font_size INTEGER NOT NULL DEFAULT 14,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_board ON whiteboard_elements(whiteboard_id);

CREATE TABLE IF NOT EXISTS whiteboard_connections (
    id UUID PRIMARY KEY,
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
    from_element_id UUID NOT NULL REFERENCES whiteboard_elements(id) ON DELETE CASCADE,
    to_element_id UUID NOT NULL REFERENCES whiteboard_elements(id) ON DELETE CASCADE,
    stroke VARCHAR(32) NOT NULL DEFAULT '#2b2d42',
    stroke_width INTEGER NOT NULL DEFAULT 2,
    points TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whiteboard_connections_board ON whiteboard_connections(whiteboard_id);


