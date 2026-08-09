-- Evita reservas duplicadas: solo puede existir una cita "viva" (pendiente
-- de verificación o confirmada) por médico+fecha+hora. Antes esto solo se
-- validaba con un SELECT previo al INSERT en /api/citas (app-level), lo
-- cual es una condición de carrera clásica — dos solicitudes casi
-- simultáneas pueden pasar la validación antes de que cualquiera inserte.
-- El índice parcial es la fuente de verdad; permite volver a agendar el
-- mismo horario una vez que la cita anterior se cancela o rechaza (sale
-- del WHERE).
CREATE UNIQUE INDEX IF NOT EXISTS citas_medico_fecha_hora_activa_unique
  ON citas (medico_id, fecha, hora)
  WHERE estado IN ('pending_verification', 'confirmed');
