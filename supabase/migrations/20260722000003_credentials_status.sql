-- Parte A/B/C — unifica la visibilidad pública de cédula + especialidad en un
-- solo campo, aprobado en conjunto por Manuel a partir de la constancia SEP
-- (documento oficial con folio, sello verificable y vigencias explícitas por
-- credencial). Reemplaza el rol de VISIBILIDAD que hoy cumplen review_status
-- (cédula) y specialty_verification_status/license_not_current (especialidad)
-- de forma independiente — esos campos se conservan para lo que ya hacían
-- (review_status = estado de cuenta; license_not_current = aviso privado en
-- el dashboard del médico), pero dejan de decidir qué se ve en el perfil
-- público.

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS credentials_status text NOT NULL DEFAULT 'pendiente'
    CHECK (credentials_status IN ('pendiente', 'verificado', 'no_coincide')),
  ADD COLUMN IF NOT EXISTS credentials_verified_at timestamptz;

-- Bitácora de constancias SEP subidas por el admin — mismo esqueleto que
-- cofepris_audit_log, permisos admin-only idénticos. Cada fila es una
-- constancia subida (permite historial si se sube una renovación).
CREATE TABLE IF NOT EXISTS public.doctor_constancia_audit_log (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id                uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
  folio                    text,
  pdf_url                  text,
  pdf_filename             text,
  license_vigencia_hasta   date,
  specialty_vigencia_hasta date,
  estado                   text DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'verificado', 'no_coincide')),
  admin_notas              text,
  fecha_registro           timestamptz DEFAULT now(),
  fecha_verificacion       timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX doctor_constancia_audit_log_doctor_id_idx ON public.doctor_constancia_audit_log(doctor_id);

ALTER TABLE public.doctor_constancia_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_constancia_audit_log_admin_only" ON public.doctor_constancia_audit_log;
CREATE POLICY "doctor_constancia_audit_log_admin_only" ON public.doctor_constancia_audit_log
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- Las constancias SEP se guardan en el mismo bucket admin-documents ya
-- existente (privado, admin-only), bajo el prefijo constancia/{doctor_id}/...
-- — no se necesita política nueva de storage, la que ya cubre el bucket
-- completo (admin_documents_admin_only) aplica a cualquier prefijo.
