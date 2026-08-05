-- Chat médico-paciente, Paso 4: búsqueda de paciente existente al agendar
-- Afecta: normalizar_telefono() extraída como función reutilizable (antes vivía
-- inline dentro del trigger vincular_paciente_cita); nueva función
-- buscar_paciente_medico() para el checkbox "ya he tenido cita con este médico".
-- No cambia comportamiento existente: vincular_paciente_cita ahora llama a
-- normalizar_telefono() en vez de repetir la lógica, mismo resultado de siempre.
--
-- Reversión:
--   DROP FUNCTION IF EXISTS buscar_paciente_medico(uuid, text);
--   -- revertir vincular_paciente_cita() a la versión inline de la migración
--   -- 20260723000003, y luego:
--   DROP FUNCTION IF EXISTS normalizar_telefono(text);

-- ── normalizar_telefono: extraída de vincular_paciente_cita ───────────────
CREATE OR REPLACE FUNCTION normalizar_telefono(p_telefono text)
RETURNS text AS $$
DECLARE
  v_tel text;
BEGIN
  IF p_telefono IS NULL OR p_telefono = '' THEN
    RETURN NULL;
  END IF;
  v_tel := regexp_replace(p_telefono, '\D', '', 'g');
  IF length(v_tel) = 12 AND left(v_tel, 2) = '52' THEN v_tel := right(v_tel, 10);
  ELSIF length(v_tel) = 13 AND left(v_tel, 3) = '521' THEN v_tel := right(v_tel, 10);
  ELSIF length(v_tel) = 11 AND left(v_tel, 1) = '1' THEN v_tel := right(v_tel, 10);
  END IF;
  IF length(v_tel) <> 10 THEN RETURN NULL; END IF;
  RETURN v_tel;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalizar_telefono(text) IS
  'Normaliza un teléfono a 10 dígitos (recorta 52/521 de país, o 1 de larga distancia). '
  'NULL si no queda en exactamente 10 dígitos (no confiable para match). '
  'Extraída de vincular_paciente_cita() en el Paso 4 para reutilizarse en buscar_paciente_medico().';

-- ── vincular_paciente_cita: mismo comportamiento, ahora reutiliza la función ──
CREATE OR REPLACE FUNCTION vincular_paciente_cita()
RETURNS trigger AS $$
DECLARE
  v_tel text;
  v_paciente_id uuid;
BEGIN
  v_tel := normalizar_telefono(NEW.paciente_telefono);

  SELECT id INTO v_paciente_id
  FROM pacientes
  WHERE email = lower(trim(NEW.paciente_email))
     OR (v_tel IS NOT NULL AND telefono = v_tel)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_paciente_id IS NULL THEN
    INSERT INTO pacientes (email, telefono)
    VALUES (lower(trim(NEW.paciente_email)), v_tel)
    RETURNING id INTO v_paciente_id;
  END IF;

  NEW.paciente_id := v_paciente_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── buscar_paciente_medico: checkbox "ya he tenido cita con este médico" ──
-- Acotada a p_medico_id: nunca expone pacientes de otro médico, aunque el
-- correo/teléfono coincida con un paciente de otra consulta en la plataforma.
CREATE OR REPLACE FUNCTION buscar_paciente_medico(p_medico_id uuid, p_contacto text)
RETURNS TABLE (
  paciente_id uuid,
  nombre text,
  email text,
  telefono text
) AS $$
DECLARE
  v_tel text;
  v_email text;
  v_paciente_id uuid;
BEGIN
  v_email := lower(trim(p_contacto));
  v_tel := normalizar_telefono(p_contacto);

  SELECT p.id INTO v_paciente_id
  FROM pacientes p
  WHERE (p.email = v_email OR (v_tel IS NOT NULL AND p.telefono = v_tel))
    AND EXISTS (
      SELECT 1 FROM citas c WHERE c.paciente_id = p.id AND c.medico_id = p_medico_id
    )
  LIMIT 1;

  IF v_paciente_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    (SELECT c.paciente_nombre FROM citas c
      WHERE c.paciente_id = p.id AND c.medico_id = p_medico_id
      ORDER BY c.created_at DESC LIMIT 1),
    p.email,
    p.telefono
  FROM pacientes p
  WHERE p.id = v_paciente_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION buscar_paciente_medico(uuid, text) IS
  'Busca un paciente por correo o teléfono (mismo criterio que vincular_paciente_cita), '
  'acotado a pacientes que ya tuvieron al menos una cita con p_medico_id. Usada por el '
  'checkbox "ya he tenido cita con este médico" (Paso 4) para prellenar el formulario. '
  'No expone pacientes de otros médicos.';
