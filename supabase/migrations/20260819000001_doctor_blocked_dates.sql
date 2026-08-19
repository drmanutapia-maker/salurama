-- Fechas puntuales bloqueadas por el médico (ej. vacaciones, un día fuera
-- de consulta) sin tener que desactivar ese día de la semana de forma
-- permanente en `doctors.horario`. Es una lista aparte del horario semanal
-- normal -- el cálculo de disponibilidad del paciente (getTimeSlotsForDate
-- en DoctorProfileClient.tsx) debe revisarla antes de ofrecer horarios.
--
-- Reversión:
--   DROP TABLE public.doctor_blocked_dates;

CREATE TABLE IF NOT EXISTS public.doctor_blocked_dates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  fecha      date NOT NULL,
  motivo     text,                    -- opcional, visible solo al médico
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, fecha)
);

CREATE INDEX doctor_blocked_dates_doctor_id_idx ON public.doctor_blocked_dates(doctor_id, fecha);

ALTER TABLE public.doctor_blocked_dates ENABLE ROW LEVEL SECURITY;

-- SELECT: pública si el médico está activo (la necesita el flujo público de
-- agendar cita, sin sesión), o el dueño, o admin -- mismo criterio que
-- doctor_gallery_photos_select.
DROP POLICY IF EXISTS "doctor_blocked_dates_select" ON public.doctor_blocked_dates;
CREATE POLICY "doctor_blocked_dates_select" ON public.doctor_blocked_dates
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.is_active = true)
  );

-- INSERT/DELETE: solo el dueño.
DROP POLICY IF EXISTS "doctor_blocked_dates_owner_insert" ON public.doctor_blocked_dates;
CREATE POLICY "doctor_blocked_dates_owner_insert" ON public.doctor_blocked_dates
  FOR INSERT WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_blocked_dates_owner_delete" ON public.doctor_blocked_dates;
CREATE POLICY "doctor_blocked_dates_owner_delete" ON public.doctor_blocked_dates
  FOR DELETE USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_blocked_dates_admin_all" ON public.doctor_blocked_dates;
CREATE POLICY "doctor_blocked_dates_admin_all" ON public.doctor_blocked_dates
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));
