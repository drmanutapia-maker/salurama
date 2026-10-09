-- Reescribe vincular_paciente_cita():
-- Antes: reutilizaba paciente existente si coincidía email OR teléfono (fusión automática).
-- Ahora: SIEMPRE crea paciente nuevo. Si hay coincidencia parcial con otro paciente
--        del mismo médico, registra una sugerencia en pacientes_sugerencias_union.
-- cita_id queda NULL en la sugerencia (trigger BEFORE INSERT, la FK aún no existe).
-- unaccent no está disponible; se normaliza con lower(trim()) solamente.

CREATE OR REPLACE FUNCTION vincular_paciente_cita()
RETURNS trigger AS $$
DECLARE
  v_tel               text;
  v_email             text;
  v_nombre            text;
  v_nuevo_id          uuid;
  v_existente         RECORD;
  v_nombre_existente  text;
  v_tipo              text;
BEGIN
  -- Flujo OTP-confirmado: paciente_id ya viene seteado desde la API, no tocar.
  IF NEW.paciente_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_email  := lower(trim(NEW.paciente_email));
  v_tel    := normalizar_telefono(NEW.paciente_telefono);
  v_nombre := lower(trim(NEW.paciente_nombre));

  -- Siempre crear paciente nuevo.
  INSERT INTO pacientes (email, telefono, nombre)
  VALUES (v_email, v_tel, v_nombre)
  RETURNING id INTO v_nuevo_id;

  NEW.paciente_id := v_nuevo_id;

  -- Buscar coincidencias parciales con pacientes existentes de este médico
  -- (excluye el recién creado). Límite 5 para evitar explosión con correos genéricos.
  -- Solo se genera sugerencia si coincide correo O teléfono (no solo nombre).
  FOR v_existente IN
    SELECT DISTINCT p.id,
      (p.email = v_email)                              AS coincide_email,
      (v_tel IS NOT NULL AND p.telefono = v_tel)       AS coincide_telefono,
      lower(trim(COALESCE(p.nombre, '')))              AS nombre_norm
    FROM pacientes p
    JOIN citas c ON c.paciente_id = p.id
    WHERE c.medico_id = NEW.medico_id
      AND p.id <> v_nuevo_id
      AND (
        p.email = v_email
        OR (v_tel IS NOT NULL AND p.telefono = v_tel)
      )
    LIMIT 5
  LOOP
    IF v_existente.coincide_email AND v_existente.coincide_telefono THEN
      IF v_existente.nombre_norm = v_nombre THEN
        v_tipo := 'email_y_telefono_mismo_nombre';
      ELSE
        v_tipo := 'email_y_telefono_nombre_diferente';
      END IF;
    ELSIF v_existente.coincide_email THEN
      v_tipo := 'solo_email';
    ELSE
      v_tipo := 'solo_telefono';
    END IF;

    INSERT INTO pacientes_sugerencias_union
      (medico_id, cita_id, paciente_nuevo_id, paciente_existente_id, tipo_coincidencia)
    VALUES (
      NEW.medico_id,
      NULL,
      v_nuevo_id,
      v_existente.id,
      v_tipo
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
