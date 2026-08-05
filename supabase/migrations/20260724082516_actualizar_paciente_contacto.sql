CREATE OR REPLACE FUNCTION actualizar_paciente_contacto(p_paciente_id uuid, p_email text, p_telefono text)
RETURNS void AS $$
BEGIN
  UPDATE pacientes
  SET email = lower(trim(p_email)),
      telefono = normalizar_telefono(p_telefono)
  WHERE id = p_paciente_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_paciente_contacto(uuid, text, text) IS
  'Sobrescribe el correo/teléfono guardado de un paciente. Se llama desde '
  '/api/citas cuando el paciente marca "actualizar mis datos" tras encontrarse '
  'vía buscar_paciente_medico() (Paso 4). Debe ejecutarse ANTES del INSERT en '
  'citas para que vincular_paciente_cita() lo vincule por el dato nuevo.';
