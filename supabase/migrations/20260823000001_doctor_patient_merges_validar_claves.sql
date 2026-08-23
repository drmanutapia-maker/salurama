-- Defensa en profundidad para doctor_patient_merges (20260819000002): hasta
-- ahora nada impedía a nivel de base de datos que clave_origen/clave_destino
-- fueran valores arbitrarios sin relación con ninguna cita real del médico
-- dueño -- en la práctica quedaba contenido porque el cliente (PacienteCard
-- + gruposResueltosPorClave en app/dashboard/citas/page.tsx) solo construye
-- esas claves a partir de SUS PROPIAS citas ya filtradas por RLS, así que
-- una fila "fuera de lugar" quedaba inerte sin fugar datos de otro médico.
-- Este trigger cierra ese hueco directamente en la base de datos, por si en
-- el futuro se agrega otra vía de escritura a esta tabla que no pase por
-- ese mismo filtro.
--
-- La condición replica exactamente cómo el cliente arma "claveCruda" (ver
-- app/dashboard/citas/page.tsx): el paciente_id de una cita propia, o, si es
-- NULL, "email:" + el correo del paciente en minúsculas y sin espacios.
--
-- Reversión:
--   DROP TRIGGER IF EXISTS trg_doctor_patient_merges_validar_claves ON public.doctor_patient_merges;
--   DROP FUNCTION IF EXISTS public.validar_claves_doctor_patient_merge();

CREATE OR REPLACE FUNCTION public.validar_claves_doctor_patient_merge()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.citas
    WHERE medico_id = NEW.medico_id
      AND (
        paciente_id::text = NEW.clave_origen
        OR ('email:' || lower(trim(paciente_email))) = NEW.clave_origen
      )
  ) THEN
    RAISE EXCEPTION 'clave_origen no corresponde a ninguna cita del médico %', NEW.medico_id
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.citas
    WHERE medico_id = NEW.medico_id
      AND (
        paciente_id::text = NEW.clave_destino
        OR ('email:' || lower(trim(paciente_email))) = NEW.clave_destino
      )
  ) THEN
    RAISE EXCEPTION 'clave_destino no corresponde a ninguna cita del médico %', NEW.medico_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_doctor_patient_merges_validar_claves ON public.doctor_patient_merges;
CREATE TRIGGER trg_doctor_patient_merges_validar_claves
  BEFORE INSERT OR UPDATE ON public.doctor_patient_merges
  FOR EACH ROW EXECUTE FUNCTION public.validar_claves_doctor_patient_merge();
