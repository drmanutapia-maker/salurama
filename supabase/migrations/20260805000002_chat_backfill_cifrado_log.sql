-- Chat médico-paciente: log permanente del backfill de cifrado (Parte 5).
-- Registra qué filas de chat_mensajes/chat_archivos se cifraron y cuándo.
-- Tensión con NOM-004 discutida y aceptada: el backfill reescribe el
-- FORMATO de almacenamiento (texto plano/binario -> cifrado, recuperable
-- byte a byte), no el contenido clínico — este log deja rastro permanente
-- de esa reescritura para trazabilidad, sin depender solo de la salida por
-- consola del script.
-- Idempotente (CREATE TABLE/INDEX IF NOT EXISTS).
--
-- Reversión:
--   DROP TABLE IF EXISTS chat_backfill_cifrado_log;

CREATE TABLE IF NOT EXISTS chat_backfill_cifrado_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL CHECK (tabla IN ('chat_mensajes', 'chat_archivos')),
  fila_id uuid NOT NULL,
  migrado_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_backfill_cifrado_log_fila ON chat_backfill_cifrado_log(tabla, fila_id);

ALTER TABLE chat_backfill_cifrado_log ENABLE ROW LEVEL SECURITY;
-- Sin políticas: tabla interna de auditoría, solo accesible vía service_role.
