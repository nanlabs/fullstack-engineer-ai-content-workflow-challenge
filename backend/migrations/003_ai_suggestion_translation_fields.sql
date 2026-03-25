ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS source_language TEXT;

ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS target_language TEXT;
