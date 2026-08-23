-- Fusión manual de "tarjetas de paciente" en /dashboard/citas -- para cuando
-- la agrupación automática (paciente_id, o email normalizado como respaldo
-- para citas viejas sin paciente_id) no unió dos tarjetas que en realidad
-- son la misma persona (ej. usó dos correos distintos entre citas).
--
-- Deliberadamente NO toca `citas.paciente_id` ni la tabla `pacientes` --
-- esa tabla es global de toda la plataforma (no tiene medico_id), y una
-- fusión ahí afectaría cómo ese paciente se ve con OTROS médicos también.
-- Esto es solo la decisión de ESTE médico de que dos claves de agrupación
-- son la misma persona para su propia vista -- se aplica al armar las
-- tarjetas, sin mutar datos compartidos.
--
-- Reversión:
--   DROP TABLE public.doctor_patient_merges;

CREATE TABLE IF NOT EXISTS public.doctor_patient_merges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id     uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  clave_origen  text NOT NULL,   -- la tarjeta que se absorbe (paciente_id o "email:...")
  clave_destino text NOT NULL,   -- la tarjeta que sobrevive
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medico_id, clave_origen)
);

CREATE INDEX IF NOT EXISTS doctor_patient_merges_medico_id_idx ON public.doctor_patient_merges(medico_id);

ALTER TABLE public.doctor_patient_merges ENABLE ROW LEVEL SECURITY;

-- Solo el dueño -- nunca se lee desde el flujo público del paciente, es
-- exclusivamente para armar la vista de citas del propio médico.
DROP POLICY IF EXISTS "doctor_patient_merges_owner_select" ON public.doctor_patient_merges;
CREATE POLICY "doctor_patient_merges_owner_select" ON public.doctor_patient_merges
  FOR SELECT USING (medico_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_patient_merges_owner_insert" ON public.doctor_patient_merges;
CREATE POLICY "doctor_patient_merges_owner_insert" ON public.doctor_patient_merges
  FOR INSERT WITH CHECK (medico_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_patient_merges_owner_delete" ON public.doctor_patient_merges;
CREATE POLICY "doctor_patient_merges_owner_delete" ON public.doctor_patient_merges
  FOR DELETE USING (medico_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_patient_merges_admin_all" ON public.doctor_patient_merges;
CREATE POLICY "doctor_patient_merges_admin_all" ON public.doctor_patient_merges
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));
