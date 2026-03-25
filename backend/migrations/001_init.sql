CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS content_pieces (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    source_text TEXT NOT NULL,
    current_text TEXT NOT NULL,
    source_language TEXT,
    target_language TEXT,
    review_state TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
    id TEXT PRIMARY KEY,
    content_piece_id TEXT NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    input_text TEXT NOT NULL,
    output_text TEXT,
    source_language TEXT,
    target_language TEXT,
    structured_output_json JSON,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS review_actions (
    id TEXT PRIMARY KEY,
    content_piece_id TEXT NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
    ai_suggestion_id TEXT REFERENCES ai_suggestions(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    comment TEXT,
    edited_text TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_pieces_campaign_id ON content_pieces (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_content_piece_id ON ai_suggestions (content_piece_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_content_piece_id ON review_actions (content_piece_id);
