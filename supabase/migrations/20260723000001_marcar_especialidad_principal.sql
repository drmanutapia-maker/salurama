-- Permite al médico intercambiar cuál de sus especialidades es la principal
-- (aprobado por Manuel 2026-07-23). Antes solo un admin podía cambiar la
-- especialidad principal (vía /admin/medicos); ahora el médico también
-- puede, siempre eligiendo de la misma lista controlada (specialty_granular_
-- mapping) — sin riesgo de texto libre. Caso de uso real: si se le vence la
-- certificación de su especialidad principal, puede poner otra vigente al
-- frente mientras se recertifica, sin perder ningún dato de la que sale.
--
-- Los 4 movimientos deben pasar todos juntos o ninguno — por eso es una
-- función de base de datos (transacción implícita de Postgres: si cualquier
-- paso lanza una excepción, TODO lo que hizo la función hasta ese punto se
-- revierte solo) en vez de varias llamadas sueltas desde el servidor.
--
-- SECURITY: no es SECURITY DEFINER ni se otorga EXECUTE a `authenticated` ni
-- `anon` — p_doctor_id es un parámetro que el que llama controla, no se
-- deriva de auth.uid() dentro de la función. Sin este parámetro no se podría
-- validar "la especialidad le pertenece a ESTE médico" con una sola función
-- reutilizable, así que la única vía segura de invocarla es a través del
-- endpoint /api/dashboard/marcar-especialidad-principal, que primero resuelve
-- el doctor_id real de la sesión autenticada con service_role y JAMÁS confía
-- en un doctor_id que venga del cliente. service_role ya tiene permiso de
-- ejecutar cualquier función de public por defecto en Supabase.
CREATE OR REPLACE FUNCTION public.marcar_especialidad_principal(
  p_doctor_id uuid,
  p_specialty_row_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_specialty_name   text;
  v_old_mapping_id       uuid;
  v_old_council          text;
  v_new_specialty_name   text;
  v_new_mapping_id       uuid;
  v_professional_license text;
BEGIN
  -- 1. La fila de la especialidad ENTRANTE debe pertenecer a este médico.
  SELECT specialty_name INTO v_new_specialty_name
  FROM public.doctor_specialties
  WHERE id = p_specialty_row_id AND doctor_id = p_doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La especialidad no pertenece a este médico o no existe';
  END IF;

  -- 2. Especialidad principal ANTES del cambio + cédula general (para la
  --    nueva fila de doctor_specialties que va a necesitar la saliente).
  SELECT specialty, professional_license
    INTO v_old_specialty_name, v_professional_license
  FROM public.doctors
  WHERE id = p_doctor_id;

  IF v_old_specialty_name = v_new_specialty_name THEN
    RAISE EXCEPTION 'Esa ya es la especialidad principal';
  END IF;

  IF v_professional_license IS NULL THEN
    RAISE EXCEPTION 'El médico no tiene cédula general registrada — no se puede completar el intercambio';
  END IF;

  -- 3. Consejo CONACEM de la especialidad SALIENTE (para su nueva fila de
  --    doctor_specialties) — puede no tener consejo (ej. Medicina General),
  --    en ese caso queda NULL, la columna lo permite.
  SELECT cc.council_name INTO v_old_council
  FROM public.specialty_granular_mapping m
  LEFT JOIN public.conacem_councils cc ON cc.id = m.conacem_council_id
  WHERE m.granular_name = v_old_specialty_name;

  -- 4. Mapeo de la especialidad ENTRANTE, para ubicar su fila de
  --    credenciales — puede no tener (misma razón).
  SELECT id INTO v_new_mapping_id
  FROM public.specialty_granular_mapping
  WHERE granular_name = v_new_specialty_name;

  -- 5. Cambia la especialidad principal visible en el perfil/buscador/SEO.
  UPDATE public.doctors SET specialty = v_new_specialty_name WHERE id = p_doctor_id;

  -- 6. La que ERA principal deja de ser is_primary — conserva TODO lo demás
  --    intacto (numero_certificacion, vigencia_hasta, credentials_status,
  --    source_constancia_id). Si no tenía fila (sin consejo), no hace nada.
  UPDATE public.doctor_specialty_credentials
  SET is_primary = false
  WHERE doctor_id = p_doctor_id AND is_primary = true;

  -- 7. La ENTRANTE se marca is_primary, si tiene fila de credenciales.
  UPDATE public.doctor_specialty_credentials
  SET is_primary = true
  WHERE doctor_id = p_doctor_id AND specialty_mapping_id = v_new_mapping_id;

  -- 8. La SALIENTE se registra como especialidad adicional (si por algún
  --    motivo ya hubiera una fila con ese nombre, no duplica).
  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_specialties
    WHERE doctor_id = p_doctor_id AND specialty_name = v_old_specialty_name
  ) THEN
    INSERT INTO public.doctor_specialties (doctor_id, specialty_name, license_number, council, is_current)
    VALUES (p_doctor_id, v_old_specialty_name, v_professional_license, v_old_council, true);
  END IF;

  -- 9. La ENTRANTE deja de estar en la lista de adicionales.
  DELETE FROM public.doctor_specialties WHERE id = p_specialty_row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_especialidad_principal(uuid, uuid) FROM PUBLIC;
