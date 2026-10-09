ALTER TABLE citas ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Backfill: las citas ya canceladas no tienen fecha exacta, dejamos NULL.
-- Solo las cancelaciones futuras quedarán registradas.
