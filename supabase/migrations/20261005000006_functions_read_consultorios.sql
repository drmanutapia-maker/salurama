-- ============================================================
-- Fase 3 / Subfase 2, paso 2.2: funciones sensibles leen de consultorios.
--
-- Las 4 funciones que leían clinic_phone / clinic_phone_visible directamente
-- de doctors ahora leen telefono / telefono_visible del consultorio principal
-- (es_principal = true). Los nombres de columna en los tipos de retorno NO
-- cambian para no romper los clientes TypeScript existentes.
--
-- Funciones reescritas:
--   get_doctor_clinic_phone          (texto público: respeta telefono_visible)
--   get_mi_doctor_datos_sensibles    (panel del médico autenticado)
--   get_doctor_datos_sensibles_admin (panel de admin por doctor)
--   get_doctors_contacto_admin       (listado admin: tiene_telefono)
-- ============================================================

-- ------------------------------------------------------------------
-- 1. get_doctor_clinic_phone
--    Lectura pública: devuelve el teléfono solo si telefono_visible=true.
--    Antes leía doctors.clinic_phone + clinic_phone_visible.
--    Ahora lee consultorios WHERE es_principal=true AND activo=true.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_doctor_clinic_phone(p_doctor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone   text;
  v_visible boolean;
BEGIN
  SELECT c.telefono, c.telefono_visible
  INTO v_phone, v_visible
  FROM public.consultorios c
  WHERE c.doctor_id = p_doctor_id
    AND c.es_principal = true
    AND c.activo = true;

  IF v_visible = true THEN
    RETURN v_phone;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- ------------------------------------------------------------------
-- 2. get_mi_doctor_datos_sensibles
--    Panel del médico: devuelve sus propios datos sensibles.
--    clinic_phone y clinic_phone_visible ahora vienen del consultorio
--    principal (LEFT JOIN para no romper si falta el consultorio).
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mi_doctor_datos_sensibles()
RETURNS TABLE(
  id                  uuid,
  email               text,
  phone               text,
  whatsapp            text,
  clinic_phone        text,
  clinic_phone_visible boolean,
  whatsapp_phone      text,
  whatsapp_available  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.email,
    d.phone,
    d.whatsapp,
    c.telefono          AS clinic_phone,
    c.telefono_visible  AS clinic_phone_visible,
    d.whatsapp_phone,
    d.whatsapp_available
  FROM public.doctors d
  LEFT JOIN public.consultorios c
    ON c.doctor_id = d.id AND c.es_principal = true
  WHERE d.user_id = auth.uid();
END;
$$;

-- ------------------------------------------------------------------
-- 3. get_doctor_datos_sensibles_admin
--    Admin: datos sensibles de un médico por id.
--    clinic_phone y clinic_phone_visible ahora vienen del consultorio
--    principal (LEFT JOIN).
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_doctor_datos_sensibles_admin(p_doctor_id uuid)
RETURNS TABLE(
  id                    uuid,
  email                 text,
  phone                 text,
  whatsapp              text,
  clinic_phone          text,
  clinic_phone_visible  boolean,
  whatsapp_phone        text,
  whatsapp_available    boolean,
  admin_notes           text,
  last_reviewed_at      timestamp with time zone,
  last_reviewed_by      text,
  stripe_customer_id    text,
  stripe_subscription_id text,
  pricing_period        text,
  pricing_tier          text,
  verification_status   text,
  review_status         text,
  license_verified      boolean,
  is_active             boolean,
  rating_avg            numeric,
  rating_count          integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.email,
    d.phone,
    d.whatsapp,
    c.telefono          AS clinic_phone,
    c.telefono_visible  AS clinic_phone_visible,
    d.whatsapp_phone,
    d.whatsapp_available,
    d.admin_notes,
    d.last_reviewed_at,
    d.last_reviewed_by,
    d.stripe_customer_id,
    d.stripe_subscription_id,
    d.pricing_period,
    d.pricing_tier,
    d.verification_status,
    d.review_status,
    d.license_verified,
    d.is_active,
    d.rating_avg,
    d.rating_count
  FROM public.doctors d
  LEFT JOIN public.consultorios c
    ON c.doctor_id = d.id AND c.es_principal = true
  WHERE d.id = p_doctor_id;
END;
$$;

-- ------------------------------------------------------------------
-- 4. get_doctors_contacto_admin
--    Admin: listado de médicos con flag tiene_telefono.
--    Antes usaba d.clinic_phone; ahora busca el telefono del
--    consultorio principal via subconsulta correlacionada.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_doctors_contacto_admin()
RETURNS TABLE(id uuid, email text, tiene_telefono boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.email,
    (COALESCE(
      NULLIF(d.phone, ''),
      NULLIF((
        SELECT c.telefono
        FROM public.consultorios c
        WHERE c.doctor_id = d.id AND c.es_principal = true
        LIMIT 1
      ), ''),
      NULLIF(d.whatsapp_phone, '')
    ) IS NOT NULL) AS tiene_telefono
  FROM public.doctors d;
END;
$$;
