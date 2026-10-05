-- ============================================================
-- PRUEBA DE 20261005000003 EN UNA TRANSACCION CON ROLLBACK
-- Pegar completo en el SQL Editor de Supabase (o npx supabase db query --linked -f).
-- Ejecuta la migracion aditiva y comprueba funciones y politicas desde cuatro roles
-- simulados (dueno+admin = Manuel, otro medico no admin, anon) y termina en ROLLBACK:
-- no deja ningun cambio. El resultado es la tabla final (n, test, resultado).
-- Si algun test dice FALLO / ERROR, NO aplicar 000003.
-- Ids usados:
--   Manuel: doctor 5fd15462-e0c6-476b-a9b7-c80575f611a2, user 61e71b89-6e13-4721-821a-96e6307867e9
--   Otro medico (no admin): doctor 5666ee58-6cfd-452e-9a34-dd1bc442fdcd, user b3cd9ae3-ba3d-4282-8230-45bb7046dde5
--   whatsapp_available=true: 618f3b7a-dfb0-4f25-a2a2-3da7a7e7198f ; =false: f58e08dc-087d-4ac7-a1ad-0b744d0e332f
-- ============================================================
BEGIN;
CREATE TEMP TABLE _t(n serial, test text, resultado text);
GRANT ALL ON _t TO public;
GRANT USAGE ON SEQUENCE _t_n_seq TO public;

-- ===== contenido de 20261005000003 =====
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

-- ===== fin 000003 =====

-- ===== estructura (como postgres) =====
INSERT INTO _t(test,resultado) VALUES
 ('bucket chat-archivos existe (esperado 1)', (SELECT count(*)::text FROM storage.buckets WHERE id='chat-archivos')),
 ('funciones nuevas (esperado 7)', (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_doctor_whatsapp','get_mi_doctor_datos_sensibles','get_doctor_datos_sensibles_admin','admin_actualizar_revision_medico','admin_set_medico_activo','get_doctors_contacto_admin','vincular_mi_doctor_por_email'))),
 ('politicas con user_id y sin email (esperado 14)', (SELECT count(*)::text FROM pg_policies WHERE schemaname='public' AND policyname IN ('Users can manage own conditions','Users can manage own education','Users can manage own experience','Users can manage own licenses','Users can manage own social media','Doctors can view own specialties','Doctors can insert own specialties','Doctors can update own specialties','Doctors can delete own specialties','doctor_specialty_credentials_own_insert','doctors_owner_update','doctors_owner_insert','doctors_owner_delete','doctors_owner_select') AND (coalesce(qual,'')||coalesce(with_check,'')) ILIKE '%user_id%' AND (coalesce(qual,'')||coalesce(with_check,'')) NOT ILIKE '%email%')),
 ('permisos de tabla doctors intactos (esperado arwdDxtm para anon y authenticated)', (SELECT relacl::text FROM pg_class WHERE oid='public.doctors'::regclass));

-- ===== como dueno + admin (Manuel) =====
SELECT set_config('request.jwt.claim.sub','61e71b89-6e13-4721-821a-96e6307867e9',true), set_config('request.jwt.claim.email','drmanutapia@gmail.com',true), set_config('request.jwt.claims','{"sub":"61e71b89-6e13-4721-821a-96e6307867e9","role":"authenticated","email":"drmanutapia@gmail.com"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM get_mi_doctor_datos_sensibles(); INSERT INTO _t(test,resultado) VALUES ('dueno: get_mi_doctor_datos_sensibles filas (esperado 1)', n::text);
  UPDATE doctor_education SET doctor_id=doctor_id WHERE doctor_id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('dueno: UPDATE doctor_education propia (esperado 7)', n::text);
  UPDATE doctor_experience SET doctor_id=doctor_id WHERE doctor_id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('dueno: UPDATE doctor_experience propia (esperado 11)', n::text);
  UPDATE doctor_conditions SET doctor_id=doctor_id WHERE doctor_id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('dueno: UPDATE doctor_conditions propia (esperado 23)', n::text);
  UPDATE doctor_specialties SET doctor_id=doctor_id WHERE doctor_id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('dueno: UPDATE doctor_specialties propia (esperado 1)', n::text);
  UPDATE doctors SET about_me=about_me WHERE id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('dueno: UPDATE doctors propia (esperado 1)', n::text);
  UPDATE doctor_education SET doctor_id=doctor_id WHERE doctor_id<>'5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('dueno: UPDATE doctor_education ajena (esperado 0)', n::text);
  SELECT count(*) INTO n FROM get_doctor_datos_sensibles_admin('5fd15462-e0c6-476b-a9b7-c80575f611a2'); INSERT INTO _t(test,resultado) VALUES ('admin: get_doctor_datos_sensibles_admin filas (esperado 1)', n::text);
  SELECT count(*) INTO n FROM get_doctors_contacto_admin(); INSERT INTO _t(test,resultado) VALUES ('admin: get_doctors_contacto_admin filas (esperado 8)', n::text);
  PERFORM admin_actualizar_revision_medico('5fd15462-e0c6-476b-a9b7-c80575f611a2','revisado',NULL,NULL,'prueba'); INSERT INTO _t(test,resultado) SELECT 'admin: admin_actualizar_revision_medico -> last_reviewed_by (esperado prueba)', last_reviewed_by FROM doctors WHERE id='5fd15462-e0c6-476b-a9b7-c80575f611a2';
  PERFORM admin_set_medico_activo('5fd15462-e0c6-476b-a9b7-c80575f611a2', true); INSERT INTO _t(test,resultado) SELECT 'admin: admin_set_medico_activo -> is_active (esperado true)', is_active::text FROM doctors WHERE id='5fd15462-e0c6-476b-a9b7-c80575f611a2';
  INSERT INTO _t(test,resultado) VALUES ('vincular_mi_doctor_por_email (esperado 5fd15462-e0c6-476b-a9b7-c80575f611a2)', vincular_mi_doctor_por_email()::text);
EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('ERROR bloque dueno/admin', SQLSTATE||' '||SQLERRM); END $$;
RESET ROLE;

-- ===== como otro medico (no admin) =====
SELECT set_config('request.jwt.claim.sub','b3cd9ae3-ba3d-4282-8230-45bb7046dde5',true), set_config('request.jwt.claim.email','stefany_rip@hotmail.com',true), set_config('request.jwt.claims','{"sub":"b3cd9ae3-ba3d-4282-8230-45bb7046dde5","role":"authenticated","email":"stefany_rip@hotmail.com"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  BEGIN PERFORM get_doctor_datos_sensibles_admin('5fd15462-e0c6-476b-a9b7-c80575f611a2'); INSERT INTO _t(test,resultado) VALUES ('no-admin: get_doctor_datos_sensibles_admin','FALLO: NO fue rechazado'); EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('no-admin: get_doctor_datos_sensibles_admin (esperado rechazo)','OK '||SQLERRM); END;
  BEGIN PERFORM admin_set_medico_activo('5fd15462-e0c6-476b-a9b7-c80575f611a2', false); INSERT INTO _t(test,resultado) VALUES ('no-admin: admin_set_medico_activo','FALLO: NO fue rechazado'); EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('no-admin: admin_set_medico_activo (esperado rechazo)','OK '||SQLSTATE); END;
  BEGIN PERFORM get_doctors_contacto_admin(); INSERT INTO _t(test,resultado) VALUES ('no-admin: get_doctors_contacto_admin','FALLO: NO fue rechazado'); EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('no-admin: get_doctors_contacto_admin (esperado rechazo)','OK '||SQLSTATE); END;
  BEGIN PERFORM admin_actualizar_revision_medico('5fd15462-e0c6-476b-a9b7-c80575f611a2','rechazado'); INSERT INTO _t(test,resultado) VALUES ('no-admin: admin_actualizar_revision_medico','FALLO: NO fue rechazado'); EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('no-admin: admin_actualizar_revision_medico (esperado rechazo)','OK '||SQLSTATE); END;
  UPDATE doctors SET about_me=about_me WHERE id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('otro medico: UPDATE doctors ajena (esperado 0)', n::text);
  UPDATE doctor_education SET doctor_id=doctor_id WHERE doctor_id='5fd15462-e0c6-476b-a9b7-c80575f611a2'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _t(test,resultado) VALUES ('otro medico: UPDATE doctor_education ajena (esperado 0)', n::text);
  SELECT count(*) INTO n FROM get_mi_doctor_datos_sensibles() WHERE id='5666ee58-6cfd-452e-9a34-dd1bc442fdcd'; INSERT INTO _t(test,resultado) VALUES ('otro medico: get_mi_doctor_datos_sensibles solo su fila (esperado 1)', n::text);
  SELECT count(*) INTO n FROM get_mi_doctor_datos_sensibles(); INSERT INTO _t(test,resultado) VALUES ('otro medico: get_mi_doctor_datos_sensibles total (esperado 1)', n::text);
EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('ERROR bloque otro medico', SQLSTATE||' '||SQLERRM); END $$;
RESET ROLE;

-- ===== como anon =====
SELECT set_config('request.jwt.claim.sub','',true), set_config('request.jwt.claims','{"role":"anon"}',true);
SET LOCAL ROLE anon;
DO $$ DECLARE n int; v text; BEGIN
  SELECT get_doctor_whatsapp('f58e08dc-087d-4ac7-a1ad-0b744d0e332f') INTO v; INSERT INTO _t(test,resultado) VALUES ('anon: get_doctor_whatsapp con whatsapp_available=false (esperado NULL)', coalesce(v,'NULL'));
  SELECT get_doctor_whatsapp('618f3b7a-dfb0-4f25-a2a2-3da7a7e7198f') INTO v; INSERT INTO _t(test,resultado) VALUES ('anon: get_doctor_whatsapp con whatsapp_available=true (esperado un numero)', CASE WHEN v IS NULL THEN 'NULL' ELSE 'numero de '||length(v)||' caracteres' END);
  SELECT count(*) INTO n FROM doctor_education; INSERT INTO _t(test,resultado) VALUES ('anon: lee doctor_education (esperado 13)', n::text);
  SELECT count(*) INTO n FROM doctor_experience; INSERT INTO _t(test,resultado) VALUES ('anon: lee doctor_experience', n::text);
  SELECT count(*) INTO n FROM doctor_conditions; INSERT INTO _t(test,resultado) VALUES ('anon: lee doctor_conditions', n::text);
  SELECT count(*) INTO n FROM doctors WHERE is_active; INSERT INTO _t(test,resultado) VALUES ('anon: lee doctors activos (esperado 8)', n::text);
  BEGIN PERFORM get_mi_doctor_datos_sensibles(); INSERT INTO _t(test,resultado) VALUES ('anon: get_mi_doctor_datos_sensibles','FALLO: NO fue rechazado'); EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('anon: get_mi_doctor_datos_sensibles (esperado rechazo)','OK '||SQLSTATE); END;
  BEGIN PERFORM get_doctor_datos_sensibles_admin('5fd15462-e0c6-476b-a9b7-c80575f611a2'); INSERT INTO _t(test,resultado) VALUES ('anon: get_doctor_datos_sensibles_admin','FALLO: NO fue rechazado'); EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('anon: get_doctor_datos_sensibles_admin (esperado rechazo)','OK '||SQLSTATE); END;
EXCEPTION WHEN others THEN INSERT INTO _t(test,resultado) VALUES ('ERROR bloque anon', SQLSTATE||' '||SQLERRM); END $$;
RESET ROLE;

SELECT n, test, resultado FROM _t ORDER BY n;
ROLLBACK;
