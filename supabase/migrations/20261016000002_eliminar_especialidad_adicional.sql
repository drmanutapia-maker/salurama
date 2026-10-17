-- ============================================================
-- Migración 20261016000002: función atómica para borrar especialidad adicional
--
-- Reemplaza las tres llamadas separadas de handleDeleteSpecialty en
-- editar-perfil/page.tsx (doctor_specialties delete + mapping lookup +
-- doctor_specialty_credentials delete). Al ser una función Postgres, los
-- tres pasos pasan todos juntos o ninguno — si cualquiera lanza excepción,
-- Postgres revierte todo lo que hizo la función hasta ese punto.
-- ============================================================

CREATE OR REPLACE FUNCTION public.eliminar_especialidad_adicional(
  p_doctor_id      uuid,
  p_specialty_row_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_specialty_name       text;
  v_principal_specialty  text;
  v_mapping_id           uuid;
BEGIN
  -- 1. Verificar que la fila pertenece a este médico.
  SELECT specialty_name INTO v_specialty_name
  FROM public.doctor_specialties
  WHERE id = p_specialty_row_id AND doctor_id = p_doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La especialidad no pertenece a este médico o no existe';
  END IF;

  -- 2. Verificar que no es la especialidad principal del médico.
  SELECT specialty INTO v_principal_specialty
  FROM public.doctors
  WHERE id = p_doctor_id;

  IF v_specialty_name = v_principal_specialty THEN
    RAISE EXCEPTION 'No se puede eliminar la especialidad principal';
  END IF;

  -- 3. Borrar la fila de doctor_specialties.
  DELETE FROM public.doctor_specialties WHERE id = p_specialty_row_id;

  -- 4. Buscar el id de mapeo en specialty_granular_mapping.
  SELECT id INTO v_mapping_id
  FROM public.specialty_granular_mapping
  WHERE granular_name = v_specialty_name;

  -- 5. Si existe el mapeo, borrar la fila de credenciales (solo adicionales,
  --    is_primary = false, para no tocar nunca la fila de la principal).
  IF v_mapping_id IS NOT NULL THEN
    DELETE FROM public.doctor_specialty_credentials
    WHERE doctor_id = p_doctor_id
      AND specialty_mapping_id = v_mapping_id
      AND is_primary = false;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_especialidad_adicional(uuid, uuid) TO authenticated;
