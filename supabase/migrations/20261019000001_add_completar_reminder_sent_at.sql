ALTER TABLE citas ADD COLUMN IF NOT EXISTS completar_reminder_sent_at timestamptz DEFAULT NULL;
