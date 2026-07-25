-- Chat médico-paciente: gate por plan. El chat es un beneficio de planes de
-- pago; los médicos en 'gratis' no deben generar fila en chat_salas al
-- agendarse una cita. Reemplaza el cuerpo de actualizar_chat_sala_cita()
-- (creada en 20260724000001_chat_salas_mensajes_archivos.sql, Paso 2 del
-- chat) sin modificar esa migración original ni el trigger que la dispara.
--
-- Reversión:
--   Restaurar el CREATE OR REPLACE FUNCTION actualizar_chat_sala_cita() tal
--   como está en 20260724000001_chat_salas_mensajes_archivos.sql (sin el
--   chequeo de pricing_tier).

CREATE OR REPLACE FUNCTION actualizar_chat_sala_cita()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM doctors d
    WHERE d.id = NEW.medico_id AND d.pricing_tier <> 'gratis'
  ) THEN
    INSERT INTO chat_salas (medico_id, paciente_id, cita_actual_id)
    VALUES (NEW.medico_id, NEW.paciente_id, NEW.id)
    ON CONFLICT (medico_id, paciente_id)
    DO UPDATE SET cita_actual_id = EXCLUDED.cita_actual_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_chat_sala_cita() IS
  'Mantiene chat_salas.cita_actual_id al agendar una cita. Gateado por plan '
  '(2026-07-25): no crea ni actualiza la fila si el médico está en '
  'doctors.pricing_tier = ''gratis''. Valores posibles: ''gratis'' | ''349'' '
  '| ''799'' | ''1999''.';
