-- ============================================================
-- Fase 3 / Subfase 3.x: ampliar get_mis_consultorios_con_telefono
--
-- La función original (000002) devolvía solo 7 campos (id, nombre, tipo,
-- telefono, telefono_visible, es_principal, activo). editar-perfil necesita
-- todos los campos del formulario de cada consultorio en un solo query.
--
-- El nombre de la función se conserva para no romper ningún llamador
-- existente; solo se amplía el conjunto de columnas devueltas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_mis_consultorios_con_telefono()
RETURNS TABLE (
  id                        uuid,
  nombre                    text,
  tipo                      text,
  street                    text,
  ext_number                text,
  int_number                text,
  floor                     text,
  colonia                   text,
  ciudad                    text,
  estado                    text,
  cp                        text,
  formatted_address         text,
  lat                       numeric,
  lng                       numeric,
  telefono                  text,
  telefono_visible          boolean,
  whatsapp_recepcion        text,
  horario                   jsonb,
  activo                    boolean,
  orden                     integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
BEGIN
  SELECT d.id INTO v_doctor_id
  FROM public.doctors d
  WHERE d.user_id = auth.uid()
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.nombre,
    c.tipo,
    c.street,
    c.ext_number,
    c.int_number,
    c.floor,
    c.colonia,
    c.ciudad,
    c.estado,
    c.cp,
    c.formatted_address,
    c.lat,
    c.lng,
    c.telefono,
    c.telefono_visible,
    c.whatsapp_recepcion,
    c.horario,
    c.activo,
    c.orden
  FROM public.consultorios c
  WHERE c.doctor_id = v_doctor_id
  ORDER BY c.orden ASC, c.created_at ASC;
END;
$$;

-- Los permisos no cambian: solo authenticated puede ejecutarla.
REVOKE EXECUTE ON FUNCTION public.get_mis_consultorios_con_telefono() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mis_consultorios_con_telefono() TO authenticated;
