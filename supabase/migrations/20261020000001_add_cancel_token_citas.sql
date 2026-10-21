ALTER TABLE citas ADD COLUMN IF NOT EXISTS cancel_token text DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS citas_cancel_token_idx ON citas(cancel_token) WHERE cancel_token IS NOT NULL;
