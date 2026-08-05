-- Bitácora de cambios al número de cédula profesional. Cada vez que un
-- médico edita professional_license desde editar-perfil, queda un
-- registro aquí (old/new) además de resetear verification_status a
-- 'pendiente' para que vuelva a la cola de revisión manual en
-- /admin/medicos (el sistema automático de verificación se retiró
-- el 2026-07-19 — ver migración de eliminación de verificar-cedulas).
--
-- Solo se escribe desde app/api/dashboard/actualizar-cedula (service_role,
-- tras validar la sesión del propio médico) — no hay policy de INSERT
-- para authenticated/anon, así que un médico no puede escribir aquí
-- directamente ni falsear su propio historial.

CREATE TABLE IF NOT EXISTS public.doctor_license_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  old_license text,
  new_license text NOT NULL,
  changed_by  uuid NOT NULL REFERENCES auth.users(id),
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX doctor_license_history_doctor_id_idx ON public.doctor_license_history(doctor_id);

ALTER TABLE public.doctor_license_history ENABLE ROW LEVEL SECURITY;

-- El médico ve su propio historial; los admins ven todo. Nadie tiene
-- policy de INSERT/UPDATE/DELETE — esas operaciones solo las hace
-- service_role desde el backend, que bypassa RLS.
DROP POLICY IF EXISTS "doctor_license_history_select" ON public.doctor_license_history;
CREATE POLICY "doctor_license_history_select" ON public.doctor_license_history
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );
