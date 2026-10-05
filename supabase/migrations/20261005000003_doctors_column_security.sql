-- ============================================================
-- Subfase 1c (parte aditiva): bucket, políticas por user_id y funciones
-- SECURITY DEFINER. NO revoca ningún permiso: es segura de aplicar con el
-- código actual en producción. Los REVOKE/GRANT por columna van en
-- 20261005000004_doctors_column_grants.sql, que se aplica DESPUÉS de
-- desplegar el código que ya no lee columnas privadas.
-- ============================================================

-- 1. Recrear bucket chat-archivos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-archivos', 'chat-archivos', false, 15728640,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas tipo A: de email a user_id
ALTER POLICY "Users can manage own conditions" ON public.doctor_conditions
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Users can manage own education" ON public.doctor_education
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Users can manage own experience" ON public.doctor_experience
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Users can manage own licenses" ON public.doctor_licenses
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Users can manage own social media" ON public.doctor_social_media
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

-- 3. Políticas tipo B: doctor_specialties y doctor_specialty_credentials
ALTER POLICY "Doctors can view own specialties" ON public.doctor_specialties
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Doctors can insert own specialties" ON public.doctor_specialties
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Doctors can update own specialties" ON public.doctor_specialties
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "Doctors can delete own specialties" ON public.doctor_specialties
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

ALTER POLICY "doctor_specialty_credentials_own_insert" ON public.doctor_specialty_credentials
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));

-- 4. Políticas tipo C: doctors misma tabla
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.doctors;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON public.doctors;
DROP POLICY IF EXISTS "Usuarios pueden eliminar su propio perfil" ON public.doctors;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.doctors;

CREATE POLICY "doctors_owner_update" ON public.doctors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "doctors_owner_insert" ON public.doctors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "doctors_owner_delete" ON public.doctors FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "doctors_owner_select" ON public.doctors FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Funciones SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_doctor_whatsapp(p_doctor_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_whatsapp text; v_available boolean;
BEGIN
  SELECT whatsapp_phone, whatsapp_available INTO v_whatsapp, v_available
  FROM public.doctors WHERE id = p_doctor_id AND is_active = true;
  IF v_available = true THEN RETURN v_whatsapp; ELSE RETURN NULL; END IF;
END;$$;
REVOKE EXECUTE ON FUNCTION public.get_doctor_whatsapp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_whatsapp(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_mi_doctor_datos_sensibles()
RETURNS TABLE(id uuid, email text, phone text, whatsapp text,
  clinic_phone text, clinic_phone_visible boolean,
  whatsapp_phone text, whatsapp_available boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT d.id, d.email, d.phone, d.whatsapp,
    d.clinic_phone, d.clinic_phone_visible, d.whatsapp_phone, d.whatsapp_available
  FROM public.doctors d WHERE d.user_id = auth.uid();
END;$$;
REVOKE EXECUTE ON FUNCTION public.get_mi_doctor_datos_sensibles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mi_doctor_datos_sensibles() TO authenticated;

-- Función para administradores: acceso a datos sensibles de cualquier médico
CREATE OR REPLACE FUNCTION public.get_doctor_datos_sensibles_admin(p_doctor_id uuid)
RETURNS TABLE(
  id                   uuid,
  email                text,
  phone                text,
  whatsapp             text,
  clinic_phone         text,
  clinic_phone_visible boolean,
  whatsapp_phone       text,
  whatsapp_available   boolean,
  admin_notes          text,
  last_reviewed_at     timestamptz,
  last_reviewed_by     text,
  stripe_customer_id   text,
  stripe_subscription_id text,
  pricing_period       text,
  pricing_tier         text,
  verification_status  text,
  review_status        text,
  license_verified     boolean,
  is_active            boolean,
  rating_avg           numeric,
  rating_count         integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo admins pueden usar esta función
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    d.id, d.email, d.phone, d.whatsapp,
    d.clinic_phone, d.clinic_phone_visible,
    d.whatsapp_phone, d.whatsapp_available,
    d.admin_notes, d.last_reviewed_at, d.last_reviewed_by,
    d.stripe_customer_id, d.stripe_subscription_id,
    d.pricing_period, d.pricing_tier, d.verification_status,
    d.review_status, d.license_verified, d.is_active,
    d.rating_avg, d.rating_count
  FROM public.doctors d
  WHERE d.id = p_doctor_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_doctor_datos_sensibles_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_datos_sensibles_admin(uuid) TO authenticated;

-- Admin: actualizar la revisión/verificación de un médico. Reemplaza los
-- UPDATE directos del panel (review_status, verification_status,
-- license_verified, last_reviewed_*), que ya no se permiten por columna.
CREATE OR REPLACE FUNCTION public.admin_actualizar_revision_medico(
  p_doctor_id           uuid,
  p_review_status       text,
  p_verification_status text    DEFAULT NULL,
  p_license_verified    boolean DEFAULT NULL,
  p_reviewed_by         text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'acceso denegado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.doctors d
  SET review_status       = p_review_status,
      last_reviewed_at    = now(),
      last_reviewed_by    = COALESCE(NULLIF(p_reviewed_by, ''), 'admin@salurama.com'),
      verification_status = COALESCE(p_verification_status, d.verification_status),
      license_verified    = COALESCE(p_license_verified, d.license_verified)
  WHERE d.id = p_doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'médico no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_actualizar_revision_medico(uuid, text, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_revision_medico(uuid, text, text, boolean, text) TO authenticated;

-- Admin: activar / desactivar un médico.
CREATE OR REPLACE FUNCTION public.admin_set_medico_activo(p_doctor_id uuid, p_activo boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'acceso denegado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.doctors d SET is_active = p_activo WHERE d.id = p_doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'médico no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_medico_activo(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_medico_activo(uuid, boolean) TO authenticated;

-- Admin: lista de contacto resumida de todos los médicos (email y si tienen
-- algún teléfono, SIN los números) para el listado y las estadísticas del
-- panel. Los números solo salen por get_doctor_datos_sensibles_admin, uno a
-- uno.
CREATE OR REPLACE FUNCTION public.get_doctors_contacto_admin()
RETURNS TABLE(id uuid, email text, tiene_telefono boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.id, d.email,
         (COALESCE(NULLIF(d.phone, ''), NULLIF(d.clinic_phone, ''), NULLIF(d.whatsapp_phone, '')) IS NOT NULL)
  FROM public.doctors d;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_doctors_contacto_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doctors_contacto_admin() TO authenticated;

-- Vincula la cuenta de sesión con el médico registrado con su mismo email
-- (cuentas anteriores que aún no tenían user_id). Solo toma un médico sin
-- user_id; si ya hay uno vinculado, devuelve ese. Reemplaza el UPDATE de
-- user_id que hacía el navegador.
CREATE OR REPLACE FUNCTION public.vincular_mi_doctor_por_email()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT d.id INTO v_id FROM public.doctors d WHERE d.user_id = auth.uid();
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  UPDATE public.doctors d
  SET user_id = auth.uid()
  WHERE d.id = (
    SELECT d2.id FROM public.doctors d2
    WHERE lower(d2.email) = lower(auth.email()) AND d2.user_id IS NULL
    LIMIT 1
  )
  RETURNING d.id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vincular_mi_doctor_por_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vincular_mi_doctor_por_email() TO authenticated;
