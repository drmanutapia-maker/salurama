-- ============================================================
-- Fase 3 / Subfase 2, paso 2.1: puente doctors -> consultorios.
--
-- Mientras el código siga escribiendo la ubicación, el teléfono y el horario
-- en `doctors` (editar-perfil, registro-medico), este trigger los refleja en
-- el consultorio principal (consultorios.es_principal = true) para que
-- nearby_doctors y los lectores que ya migraron nunca vean datos viejos.
-- Es TEMPORAL: se elimina en el paso 2.6, cuando editar-perfil escribe
-- directo en `consultorios`. Reversión:
-- supabase/pendientes/reversion_000005_puente_consultorios.sql
--
-- Es solo aditiva: no cambia permisos ni datos existentes. Hoy hay 8
-- médicos y 8 consultorios principales ya iguales, así que no hay backfill.
--
-- Mapeo (doctors -> consultorios):
--   clinic_name -> nombre            clinic_type -> tipo (solo 'hospital' o 'consultorio')
--   clinic_lat -> lat                clinic_lng -> lng
--   clinic_phone -> telefono         clinic_phone_visible -> telefono_visible
--   street, ext_number, int_number, floor, colonia, ciudad, estado, cp (igual)
--   horario, wheelchair_accessible, has_elevator, has_parking,
--   public_transport_nearby (igual)
--   is_active -> activo (solo el principal; ver nota abajo)
--   formatted_address: si cambió clinic_address se usa ese valor (el editor
--     solo escribe clinic_address; null propaga null); si cambió
--     clinic_formatted_address, ese (o clinic_address si es null); en una
--     fila nueva, COALESCE(clinic_formatted_address, clinic_address), igual
--     que la migración original de consultorios.
--
-- Nota is_active -> activo: la política pública de consultorios solo mira
-- consultorios.activo, no doctors.is_active. Sin este mapeo, un médico recién
-- registrado (is_active = false hasta confirmar su correo) o desactivado por
-- el admin tendría su dirección y coordenadas legibles con la clave anónima,
-- y al confirmar su correo su consultorio seguiría inactivo y no saldría en
-- el buscador. Por eso is_active también dispara el trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_doctor_a_consultorio_principal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo            text;
  v_formatted_nuevo text;   -- valor para una fila que se inserta
  v_formatted       text;   -- valor para una fila que se actualiza
  v_tocar_formatted boolean;
  v_horario_defecto constant jsonb := '{
    "lunes":     {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "martes":    {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "miercoles": {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "jueves":    {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "viernes":   {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "sabado":    {"activo": false, "inicio": "09:00", "fin": "14:00"},
    "domingo":   {"activo": false, "inicio": "09:00", "fin": "14:00"}
  }'::jsonb;
BEGIN
  -- consultorios.tipo solo acepta 'consultorio' o 'hospital'; cualquier otro
  -- valor en doctors.clinic_type no debe hacer fallar el guardado del médico.
  v_tipo := CASE WHEN lower(btrim(COALESCE(NEW.clinic_type, ''))) = 'hospital'
                 THEN 'hospital' ELSE 'consultorio' END;

  v_formatted_nuevo := COALESCE(NEW.clinic_formatted_address, NEW.clinic_address);

  IF TG_OP = 'INSERT' THEN
    v_tocar_formatted := true;
    v_formatted := v_formatted_nuevo;
  ELSIF NEW.clinic_address IS DISTINCT FROM OLD.clinic_address THEN
    v_tocar_formatted := true;
    v_formatted := NEW.clinic_address;
  ELSIF NEW.clinic_formatted_address IS DISTINCT FROM OLD.clinic_formatted_address THEN
    v_tocar_formatted := true;
    v_formatted := v_formatted_nuevo;
  ELSE
    v_tocar_formatted := false;
    v_formatted := NULL;
  END IF;

  -- Una sola sentencia atómica: actualiza el principal o lo crea si no existe
  -- (el índice único parcial idx_consultorios_principal evita duplicados).
  INSERT INTO public.consultorios AS c (
    doctor_id, nombre, tipo,
    street, ext_number, int_number, floor, colonia, ciudad, estado, cp,
    formatted_address, lat, lng,
    telefono, telefono_visible,
    horario,
    wheelchair_accessible, has_elevator, has_parking, public_transport_nearby,
    es_principal, activo, orden
  ) VALUES (
    NEW.id, NEW.clinic_name, v_tipo,
    NEW.street, NEW.ext_number, NEW.int_number, NEW.floor, NEW.colonia, NEW.ciudad, NEW.estado, NEW.cp,
    v_formatted_nuevo, NEW.clinic_lat, NEW.clinic_lng,
    NEW.clinic_phone, COALESCE(NEW.clinic_phone_visible, false),
    COALESCE(NEW.horario, v_horario_defecto),
    COALESCE(NEW.wheelchair_accessible, false), COALESCE(NEW.has_elevator, false),
    COALESCE(NEW.has_parking, false), COALESCE(NEW.public_transport_nearby, false),
    true, COALESCE(NEW.is_active, true), 0
  )
  ON CONFLICT (doctor_id) WHERE es_principal = true
  DO UPDATE SET
    nombre                  = NEW.clinic_name,
    tipo                    = v_tipo,
    street                  = NEW.street,
    ext_number              = NEW.ext_number,
    int_number              = NEW.int_number,
    floor                   = NEW.floor,
    colonia                 = NEW.colonia,
    ciudad                  = NEW.ciudad,
    estado                  = NEW.estado,
    cp                      = NEW.cp,
    formatted_address       = CASE WHEN v_tocar_formatted THEN v_formatted ELSE c.formatted_address END,
    lat                     = NEW.clinic_lat,
    lng                     = NEW.clinic_lng,
    telefono                = NEW.clinic_phone,
    telefono_visible        = COALESCE(NEW.clinic_phone_visible, false),
    horario                 = COALESCE(NEW.horario, c.horario),
    wheelchair_accessible   = COALESCE(NEW.wheelchair_accessible, false),
    has_elevator            = COALESCE(NEW.has_elevator, false),
    has_parking             = COALESCE(NEW.has_parking, false),
    public_transport_nearby = COALESCE(NEW.public_transport_nearby, false),
    activo                  = COALESCE(NEW.is_active, c.activo);

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_doctor_a_consultorio_principal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_doctors_sync_consultorio_ins ON public.doctors;
CREATE TRIGGER trg_doctors_sync_consultorio_ins
  AFTER INSERT ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.sync_doctor_a_consultorio_principal();

DROP TRIGGER IF EXISTS trg_doctors_sync_consultorio_upd ON public.doctors;
CREATE TRIGGER trg_doctors_sync_consultorio_upd
  AFTER UPDATE OF
    clinic_lat, clinic_lng, clinic_name, clinic_address, clinic_formatted_address,
    clinic_type, street, ext_number, int_number, floor, colonia, ciudad, estado, cp,
    clinic_phone, clinic_phone_visible, horario,
    wheelchair_accessible, has_elevator, has_parking, public_transport_nearby,
    is_active
  ON public.doctors
  FOR EACH ROW
  WHEN (
    (OLD.clinic_lat, OLD.clinic_lng, OLD.clinic_name, OLD.clinic_address, OLD.clinic_formatted_address,
     OLD.clinic_type, OLD.street, OLD.ext_number, OLD.int_number, OLD.floor, OLD.colonia, OLD.ciudad,
     OLD.estado, OLD.cp, OLD.clinic_phone, OLD.clinic_phone_visible, OLD.horario,
     OLD.wheelchair_accessible, OLD.has_elevator, OLD.has_parking, OLD.public_transport_nearby,
     OLD.is_active)
    IS DISTINCT FROM
    (NEW.clinic_lat, NEW.clinic_lng, NEW.clinic_name, NEW.clinic_address, NEW.clinic_formatted_address,
     NEW.clinic_type, NEW.street, NEW.ext_number, NEW.int_number, NEW.floor, NEW.colonia, NEW.ciudad,
     NEW.estado, NEW.cp, NEW.clinic_phone, NEW.clinic_phone_visible, NEW.horario,
     NEW.wheelchair_accessible, NEW.has_elevator, NEW.has_parking, NEW.public_transport_nearby,
     NEW.is_active)
  )
  EXECUTE FUNCTION public.sync_doctor_a_consultorio_principal();
