-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-07,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.

-- ============================================================
-- MIGRACIÓN MSL-002: Historial de conversaciones del chat
-- ============================================================

CREATE TABLE msl_conversations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id),
  specialty   TEXT        NOT NULL DEFAULT 'hematologia',
  pathology   TEXT        DEFAULT 'mieloma_multiple',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE msl_messages (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  UUID        NOT NULL REFERENCES msl_conversations(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT        NOT NULL,
  sources          JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE msl_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE msl_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
  ON msl_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own messages"
  ON msl_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM msl_conversations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM msl_conversations WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_msl_messages_conversation_id ON msl_messages(conversation_id);
CREATE INDEX idx_msl_conversations_user_id    ON msl_conversations(user_id);
