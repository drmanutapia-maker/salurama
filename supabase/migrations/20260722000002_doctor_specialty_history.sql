-- Bitácora de cambios al consejo de especialidad declarado. Mismo patrón
-- exacto que doctor_license_history (20260719000002), pero en tabla propia
-- para mantener cédula y especialidad completamente independientes, tal
-- como ya lo son sus campos de verificación.
--
-- Cada vez que un médico edita specialty_council desde editar-perfil, queda
-- un registro aquí (old/new) además de resetear specialty_verification_status
-- a 'pendiente' y license_not_current a false — editar el consejo es la
-- única forma de "salir" de un license_not_current=true declarado en el
-- registro, ya que hoy no existe ningún otro control (ni de médico ni de
-- admin) para desmarcarlo.
--
-- Solo se escribe desde app/api/dashboard/actualizar-especialidad
-- (service_role, tras validar la sesión del propio médico) — no hay policy
-- de INSERT para authenticated/anon, así que un médico no puede escribir
-- aquí directamente ni falsear su propio historial.

CREATE TABLE IF NOT EXISTS public.doctor_specialty_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  old_council   text,
  new_council   text,
  changed_by    uuid NOT NULL REFERENCES auth.users(id),
  changed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX doctor_specialty_history_doctor_id_idx ON public.doctor_specialty_history(doctor_id);

ALTER TABLE public.doctor_specialty_history ENABLE ROW LEVEL SECURITY;

-- El médico ve su propio historial; los admins ven todo. Nadie tiene
-- policy de INSERT/UPDATE/DELETE — esas operaciones solo las hace
-- service_role desde el backend, que bypassa RLS.
DROP POLICY IF EXISTS "doctor_specialty_history_select" ON public.doctor_specialty_history;
CREATE POLICY "doctor_specialty_history_select" ON public.doctor_specialty_history
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );
