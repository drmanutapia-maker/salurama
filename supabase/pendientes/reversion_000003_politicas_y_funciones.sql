-- ============================================================
-- REVERSIÓN de 20261005000003_doctors_column_security.sql (parte aditiva)
-- Ejecutar a mano (npx supabase db query --linked -f <este archivo>) SOLO si
-- hace falta. No va en supabase/migrations/.
--
-- Restaura las políticas originales (ver estado_previo_permisos_doctors_20261005.md,
-- recreándolas: ALTER POLICY no puede quitar un WITH CHECK) y elimina las
-- funciones nuevas. NO elimina el bucket chat-archivos: el chat lo necesita
-- (antes de 000003 el bucket no existía por un borrado accidental).
-- ============================================================
BEGIN;

-- Políticas tipo A (ALL, public, sin WITH CHECK)
DROP POLICY IF EXISTS "Users can manage own conditions" ON public.doctor_conditions;
CREATE POLICY "Users can manage own conditions" ON public.doctor_conditions FOR ALL TO public
  USING (doctor_id IN (SELECT doctors.id FROM doctors WHERE doctors.email = (auth.jwt() ->> 'email'::text)));

DROP POLICY IF EXISTS "Users can manage own education" ON public.doctor_education;
CREATE POLICY "Users can manage own education" ON public.doctor_education FOR ALL TO public
  USING (doctor_id IN (SELECT doctors.id FROM doctors WHERE doctors.email = (auth.jwt() ->> 'email'::text)));

DROP POLICY IF EXISTS "Users can manage own experience" ON public.doctor_experience;
CREATE POLICY "Users can manage own experience" ON public.doctor_experience FOR ALL TO public
  USING (doctor_id IN (SELECT doctors.id FROM doctors WHERE doctors.email = (auth.jwt() ->> 'email'::text)));

DROP POLICY IF EXISTS "Users can manage own licenses" ON public.doctor_licenses;
CREATE POLICY "Users can manage own licenses" ON public.doctor_licenses FOR ALL TO public
  USING (doctor_id IN (SELECT doctors.id FROM doctors WHERE doctors.email = (auth.jwt() ->> 'email'::text)));

DROP POLICY IF EXISTS "Users can manage own social media" ON public.doctor_social_media;
CREATE POLICY "Users can manage own social media" ON public.doctor_social_media FOR ALL TO public
  USING (doctor_id IN (SELECT doctors.id FROM doctors WHERE doctors.email = (auth.jwt() ->> 'email'::text)));

-- Políticas tipo B
DROP POLICY IF EXISTS "Doctors can view own specialties" ON public.doctor_specialties;
CREATE POLICY "Doctors can view own specialties" ON public.doctor_specialties FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialties.doctor_id AND doctors.email = auth.email()));

DROP POLICY IF EXISTS "Doctors can insert own specialties" ON public.doctor_specialties;
CREATE POLICY "Doctors can insert own specialties" ON public.doctor_specialties FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialties.doctor_id AND doctors.email = auth.email()));

DROP POLICY IF EXISTS "Doctors can update own specialties" ON public.doctor_specialties;
CREATE POLICY "Doctors can update own specialties" ON public.doctor_specialties FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialties.doctor_id AND doctors.email = auth.email()));

DROP POLICY IF EXISTS "Doctors can delete own specialties" ON public.doctor_specialties;
CREATE POLICY "Doctors can delete own specialties" ON public.doctor_specialties FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialties.doctor_id AND doctors.email = auth.email()));

DROP POLICY IF EXISTS "doctor_specialty_credentials_own_insert" ON public.doctor_specialty_credentials;
CREATE POLICY "doctor_specialty_credentials_own_insert" ON public.doctor_specialty_credentials FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialty_credentials.doctor_id AND doctors.email = auth.email()));

-- Políticas tipo C
DROP POLICY IF EXISTS "doctors_owner_update" ON public.doctors;
DROP POLICY IF EXISTS "doctors_owner_insert" ON public.doctors;
DROP POLICY IF EXISTS "doctors_owner_delete" ON public.doctors;
DROP POLICY IF EXISTS "doctors_owner_select" ON public.doctors;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.doctors FOR UPDATE TO authenticated
  USING (auth.email() = email) WITH CHECK (auth.email() = email);
CREATE POLICY "Usuarios pueden crear su propio perfil" ON public.doctors FOR INSERT TO authenticated
  WITH CHECK (auth.email() = email);
CREATE POLICY "Usuarios pueden eliminar su propio perfil" ON public.doctors FOR DELETE TO authenticated
  USING (auth.email() = email);
CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.doctors FOR SELECT TO authenticated
  USING (auth.email() = email);

-- Funciones nuevas
DROP FUNCTION IF EXISTS public.get_doctor_whatsapp(uuid);
DROP FUNCTION IF EXISTS public.get_mi_doctor_datos_sensibles();
DROP FUNCTION IF EXISTS public.get_doctor_datos_sensibles_admin(uuid);
DROP FUNCTION IF EXISTS public.get_doctors_contacto_admin();
DROP FUNCTION IF EXISTS public.admin_actualizar_revision_medico(uuid, text, text, boolean, text);
DROP FUNCTION IF EXISTS public.admin_set_medico_activo(uuid, boolean);
DROP FUNCTION IF EXISTS public.vincular_mi_doctor_por_email();

COMMIT;
