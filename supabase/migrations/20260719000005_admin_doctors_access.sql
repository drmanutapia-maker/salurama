-- Corrige el bug crítico encontrado en /admin/medicos y /admin: sus
-- escrituras (Aprobar cédula, Marcar verificada, Activar/Desactivar)
-- usan el cliente de Supabase del navegador, pero el "login" de admin
-- (app/api/admin-login) solo verifica una contraseña compartida y nunca
-- crea una sesión real de Supabase Auth — así que auth.uid() es NULL y
-- ninguna política de doctors deja pasar la escritura. Falla en
-- silencio: error null, data [], la fila real nunca cambia.
--
-- Fix elegido: autenticación real de admin (login con cuenta de
-- Supabase que tenga fila en admins) + estas políticas nuevas en
-- doctors, mismo patrón EXISTS ya usado en doctor-documents,
-- admin-documents, doctor_license_audit_log y cofepris_audit_log.

CREATE POLICY "admins_select_all_doctors" ON public.doctors
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "admins_update_all_doctors" ON public.doctors
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- La tabla admins tenía 0 filas reales — sin al menos una, nadie podría
-- pasar el nuevo login de admin, ni siquiera Manuel. Se registra su
-- cuenta ya existente (la misma con la que está registrado como médico)
-- como el primer admin real.
INSERT INTO public.admins (user_id, email, role)
VALUES ('61e71b89-6e13-4721-821a-96e6307867e9', 'drmanutapia@gmail.com', 'admin')
ON CONFLICT DO NOTHING;
