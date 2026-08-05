-- Bitácoras de admin, solo-admin (nunca visibles para médicos): evidencia
-- interna de diligencia al verificar cédula (SEP) y Aviso de Publicidad
-- (COFEPRIS) manualmente contra las fuentes oficiales. Mismo patrón de
-- seguridad ya corregido en doctor-documents: EXISTS contra admins.

-- admin_verificaciones_sep ya existía (poblada desde app/api/registro-medico
-- en cada registro, 7 filas reales) pero con RLS habilitado y CERO políticas
-- — bloqueada hasta para admins. Se renombra a doctor_license_audit_log
-- (nombre acordado) conservando los datos, y se le agrega la política que
-- le faltaba.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_verificaciones_sep')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doctor_license_audit_log') THEN
    ALTER TABLE public.admin_verificaciones_sep RENAME TO doctor_license_audit_log;
  END IF;
END $$;

DROP POLICY IF EXISTS "doctor_license_audit_log_admin_only" ON public.doctor_license_audit_log;
CREATE POLICY "doctor_license_audit_log_admin_only" ON public.doctor_license_audit_log
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- cofepris_audit_log — mismo esqueleto que doctor_license_audit_log,
-- adaptado a campos de COFEPRIS. Se llena desde
-- app/api/dashboard/cofepris/guardar-numero cuando el médico guarda su
-- número de aviso en el wizard.
CREATE TABLE IF NOT EXISTS public.cofepris_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id      uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
  aviso_numero   text NOT NULL,
  full_name      text NOT NULL,
  specialty      text,
  estado_solicitud text DEFAULT 'pendiente_descarga',
  fecha_registro timestamptz DEFAULT now(),
  fecha_descarga timestamptz,
  pdf_url        text,
  pdf_filename   text,
  ip_registro    text,
  admin_notas    text,
  datos_cofepris jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cofepris_audit_log_doctor_id_idx ON public.cofepris_audit_log(doctor_id);

ALTER TABLE public.cofepris_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cofepris_audit_log_admin_only" ON public.cofepris_audit_log;
CREATE POLICY "cofepris_audit_log_admin_only" ON public.cofepris_audit_log
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- Bucket compartido para los PDFs de ambas bitácoras (evidencia que Manuel
-- descarga de los portales oficiales) — privado, admin-only, sin excepción
-- por dueño médico (nunca debe ser visible para el médico). Path por
-- convención: sep/{doctor_id}/... y cofepris/{doctor_id}/...
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admin-documents', 'admin-documents', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admin_documents_admin_only" ON storage.objects;
CREATE POLICY "admin_documents_admin_only" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'admin-documents'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'admin-documents'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );
