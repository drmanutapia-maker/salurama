-- Agrega columna nombre a pacientes y la rellena desde la cita más reciente.
-- El trigger vincular_paciente_cita() la poblará en adelante al crear nuevos registros.

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nombre text;

UPDATE pacientes p
SET nombre = lower(trim((
  SELECT c.paciente_nombre
  FROM citas c
  WHERE c.paciente_id = p.id
  ORDER BY c.created_at DESC
  LIMIT 1
)));
