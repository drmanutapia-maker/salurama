-- Pivote a directorio 100% gratis, Parte 2 (chat médico-paciente): revierte
-- el gate por plan introducido en 20260725000001_chat_sala_gate_plan_gratis.sql
-- sin modificar esa migración vieja. Restaura actualizar_chat_sala_cita() tal
-- como estaba en 20260724000001_chat_salas_mensajes_archivos.sql (Paso 2 del
-- chat) — sin el chequeo de pricing_tier. El trigger trg_citas_actualizar_chat_sala
-- no se toca (nunca lo tocó la migración del gate tampoco).
--
-- Reversión (si se quisiera restaurar el gate):
--   Volver a aplicar el CREATE OR REPLACE FUNCTION de
--   20260725000001_chat_sala_gate_plan_gratis.sql.

CREATE OR REPLACE FUNCTION actualizar_chat_sala_cita()
RETURNS trigger AS $$
BEGIN
  INSERT INTO chat_salas (medico_id, paciente_id, cita_actual_id)
  VALUES (NEW.medico_id, NEW.paciente_id, NEW.id)
  ON CONFLICT (medico_id, paciente_id)
  DO UPDATE SET cita_actual_id = EXCLUDED.cita_actual_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_chat_sala_cita() IS
  'Mantiene chat_salas.cita_actual_id al agendar una cita. Sin gate por plan '
  'desde el pivote a directorio 100% gratis (2026-08-04) — ver '
  '20260804000002_revertir_chat_sala_gate_plan_gratis.sql. El gate por '
  'pricing_tier que existió entre 2026-07-25 y esta fecha quedó retirado.';
