CREATE TABLE IF NOT EXISTS ai_provider_settings (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    api_key_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
