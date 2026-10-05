-- ============================================================
-- Seguridad de columnas de teléfono (parte 1: consultorios)
--
-- consultorios.telefono: quitar de authenticated; el médico dueño lo lee
-- con una función SECURITY DEFINER. (La parte de `doctors` -- revocar
-- columnas sensibles a anon -- queda pendiente: ver
-- supabase/pendientes/20261005000003_doctors_anon_column_security.sql.draft)
-- ============================================================

-- Revocar acceso actual de authenticated y regrantar sin telefono
REVOKE ALL ON TABLE public.consultorios FROM authenticated;

GRANT SELECT (
  id, created_at, updated_at, doctor_id, nombre, tipo,
  street, ext_number, int_number, floor, colonia, ciudad, estado, cp,
  formatted_address, lat, lng, telefono_visible, horario,
  wheelchair_accessible, has_elevator, has_parking, public_transport_nearby,
  es_principal, activo, orden
) ON public.consultorios TO authenticated;

-- El médico dueño puede seguir escribiendo sus propios consultorios (las
-- políticas RLS limitan a cuáles filas)
GRANT INSERT, UPDATE, DELETE ON public.consultorios TO authenticated;

-- Función para que el médico dueño lea el teléfono de sus propios consultorios.
-- Solo devuelve datos de los consultorios del médico autenticado.
CREATE OR REPLACE FUNCTION public.get_mis_consultorios_con_telefono()
RETURNS TABLE (
  id                  uuid,
  nombre              text,
  tipo                text,
  telefono            text,
  telefono_visible    boolean,
  es_principal        boolean,
  activo              boolean
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
    c.telefono,
    c.telefono_visible,
    c.es_principal,
    c.activo
  FROM public.consultorios c
  WHERE c.doctor_id = v_doctor_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_mis_consultorios_con_telefono() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mis_consultorios_con_telefono() TO authenticated;
