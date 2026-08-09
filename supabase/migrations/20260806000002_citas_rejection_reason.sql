-- Motivo de rechazo del médico al rechazar una cita pendiente. citas.estado
-- no tiene CHECK constraint (confirmado por consulta a pg_constraint, igual
-- que en la migración anterior) — solo se agrega la columna, sin tocar
-- ninguna restricción.
--
-- Reversión:
--   ALTER TABLE citas DROP COLUMN IF EXISTS rejection_reason;

ALTER TABLE citas ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN citas.rejection_reason IS
  'Motivo que escribe el médico al rechazar una cita pendiente (estado pasa '
  'a cancelled). Texto libre, obligatorio en el flujo de rechazo. NULL para '
  'citas no rechazadas o canceladas por otra vía (paciente, expiración).';
