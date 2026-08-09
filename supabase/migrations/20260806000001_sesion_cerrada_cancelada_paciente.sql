-- citas.estado no tiene CHECK constraint (columna text libre, confirmado por
-- consulta a pg_constraint) — no hay nada que ampliar ahí para el nuevo valor
-- 'cancelada_paciente' (cancelación hecha por el paciente, paso 1 de la
-- cancelación de citas, distinto de 'cancelled' que queda reservado para el
-- rechazo del médico).
--
-- Lo que sí hay que actualizar es sesion_cerrada(): solo reconocía
-- 'cancelled' como cierre. Sin este cambio, una cita cancelada por el
-- paciente seguiría admitiendo mensajes nuevos en el chat (RLS de
-- chat_mensajes/chat_archivos depende de esta función).
--
-- Reversión:
--   CREATE OR REPLACE FUNCTION sesion_cerrada(p_cita_id uuid)
--   RETURNS boolean AS $$
--     SELECT c.estado = 'cancelled'
--         OR (c.estado = 'completed' AND now() > c.completed_at + interval '72 hours')
--     FROM citas c
--     WHERE c.id = p_cita_id;
--   $$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION sesion_cerrada(p_cita_id uuid)
RETURNS boolean AS $$
  SELECT c.estado IN ('cancelled', 'cancelada_paciente')
      OR (c.estado = 'completed' AND now() > c.completed_at + interval '72 hours')
  FROM citas c
  WHERE c.id = p_cita_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION sesion_cerrada(uuid) IS
  'true si la sesión (cita) ya no admite escritura del médico: cancelada '
  '(por el médico o por el paciente), o completada hace más de 72 horas. '
  'NULL (cita inexistente, o completada sin completed_at por ser anterior '
  'al Paso 1) se evalúa como cerrada en RLS.';
