-- Corrige la política "Admins acceso total documentos" en el bucket
-- doctor-documents: usaba auth.jwt()->>'email' LIKE '%admin%', un criterio
-- de escalación de privilegios auto-servida — cualquier médico podía
-- registrarse con "admin" en cualquier parte de su correo y obtener
-- acceso total a los documentos privados de todos los demás médicos.
-- Reemplazada por el mismo patrón real ya usado en admin_actions y
-- specialty_councils: EXISTS contra la tabla admins vía auth.uid().
-- No afecta a ningún usuario real (0 correos con "admin" en producción
-- al momento de este fix, confirmado antes de aplicar).

DROP POLICY IF EXISTS "Admins acceso total documentos" ON storage.objects;

CREATE POLICY "Admins acceso total documentos" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'doctor-documents'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'doctor-documents'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );
