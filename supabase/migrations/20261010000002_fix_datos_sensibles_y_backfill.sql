-- Fix de las 4 funciones RPCs que usaban es_principal=true para ubicar el
-- consultorio principal. Deben actualizarse ANTES de que 000001 dropee la
-- columna, o fallarán en runtime. Todas pasan a usar orden=1.
--
-- También incluye el backfill de doctors.ciudad/estado desde consultorios
-- para los médicos cuya fila en doctors quedó desincronizada (el trigger
-- trg_consultorios_sync_ciudad_estado solo dispara en cambios futuros; no
-- corrige registros ya desincronizados).

-- ── 1. get_doctor_clinic_phone ────────────────────────────────────────────────
--    Lectura pública: devuelve el teléfono del consultorio principal
--    (orden=1, activo=true) solo si telefono_visible=true.
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
    AND c.orden = 1
    AND c.activo = true;

  IF v_visible = true THEN
    RETURN v_phone;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_clinic_phone(uuid) TO anon, authenticated;

-- ── 2. get_mi_doctor_datos_sensibles ─────────────────────────────────────────
--    Panel del médico autenticado: devuelve sus propios datos sensibles.
--    clinic_phone y clinic_phone_visible vienen del consultorio orden=1.
CREATE OR REPLACE FUNCTION public.get_mi_doctor_datos_sensibles()
RETURNS TABLE(
  id                   uuid,
  email                text,
  phone                text,
  whatsapp             text,
  clinic_phone         text,
  clinic_phone_visible boolean,
  whatsapp_phone       text,
  whatsapp_available   boolean
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
    c.telefono         AS clinic_phone,
    c.telefono_visible AS clinic_phone_visible,
    d.whatsapp_phone,
    d.whatsapp_available
  FROM public.doctors d
  LEFT JOIN public.consultorios c
    ON c.doctor_id = d.id AND c.orden = 1
  WHERE d.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mi_doctor_datos_sensibles() TO authenticated;

-- ── 3. get_doctor_datos_sensibles_admin ──────────────────────────────────────
--    Admin: datos sensibles de un médico por id.
CREATE OR REPLACE FUNCTION public.get_doctor_datos_sensibles_admin(p_doctor_id uuid)
RETURNS TABLE(
  id                     uuid,
  email                  text,
  phone                  text,
  whatsapp               text,
  clinic_phone           text,
  clinic_phone_visible   boolean,
  whatsapp_phone         text,
  whatsapp_available     boolean,
  admin_notes            text,
  last_reviewed_at       timestamp with time zone,
  last_reviewed_by       text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  pricing_period         text,
  pricing_tier           text,
  verification_status    text,
  review_status          text,
  license_verified       boolean,
  is_active              boolean,
  rating_avg             numeric,
  rating_count           integer
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
    c.telefono         AS clinic_phone,
    c.telefono_visible AS clinic_phone_visible,
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
    ON c.doctor_id = d.id AND c.orden = 1
  WHERE d.id = p_doctor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_datos_sensibles_admin(uuid) TO authenticated;

-- ── 4. get_doctors_contacto_admin ────────────────────────────────────────────
--    Admin: listado de médicos con flag tiene_telefono.
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
        WHERE c.doctor_id = d.id AND c.orden = 1
        LIMIT 1
      ), ''),
      NULLIF(d.whatsapp_phone, '')
    ) IS NOT NULL) AS tiene_telefono
  FROM public.doctors d;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctors_contacto_admin() TO authenticated;

-- ── 5. Backfill ciudad/estado en doctors ──────────────────────────────────────
--    El trigger trg_consultorios_sync_ciudad_estado solo dispara en cambios
--    futuros. Este UPDATE corrige los registros ya desincronizados.
UPDATE public.doctors d
SET
  ciudad = c.ciudad,
  estado = c.estado
FROM public.consultorios c
WHERE c.doctor_id = d.id
  AND c.orden = 1
  AND c.activo = true
  AND (d.ciudad IS DISTINCT FROM c.ciudad OR d.estado IS DISTINCT FROM c.estado);
