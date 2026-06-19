-- HEMA: RPCs para el wizard de indicaciones (Sesión 8)
-- 1. Ampliar hema_get_protocol con flags clínicos del fármaco
--    (is_anthracycline, cyp3a4_substrate, cumulative_max_mg_m2, requires_test_dose)
--    que el motor de validación (hema-orders-calculate) necesita en OrderInputDrug.
-- 2. hema_create_order — inserta hema.orders + hema.order_drugs en una sola
--    transacción. El trigger BEFORE INSERT (hema_order_clinical_validation)
--    sigue corriendo como respaldo; la validación real ya ocurrió en el
--    cliente llamando a hema-orders-calculate antes de este INSERT.
-- Afecta schema: public (funciones), no toca hema
-- Reversión:
--   DROP FUNCTION public.hema_create_order(uuid,uuid,uuid,text,int,int,uuid,numeric,text,date,uuid,jsonb,int,uuid);
--   -- revertir hema_get_protocol a la versión de 20260617000002_hema_admin_protocols_fns.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. hema_get_protocol — agrega flags clínicos a cada fármaco
--    Misma firma que la versión anterior — no rompe a admin/protocolos.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_get_protocol(p_protocol_id uuid)
RETURNS TABLE (
  id                   uuid,
  code                 text,
  name                 text,
  cycle_length_days    int,
  total_cycles         int,
  line_of_therapy      text,
  specialty            text,
  active               boolean,
  approved_at          timestamptz,
  approved_by_name     text,
  status               text,
  protocol_references  jsonb,
  diagnoses            jsonb,
  drugs                jsonb
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.code,
    p.name,
    p.cycle_length_days,
    p.total_cycles,
    p.line_of_therapy,
    p.specialty,
    p.active,
    p.approved_at,
    doc.full_name AS approved_by_name,
    CASE
      WHEN p.active THEN 'activo'
      WHEN p.approved_by_medical_director IS NULL THEN 'pendiente'
      ELSE 'inactivo'
    END AS status,
    p.protocol_references,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'code', dx.code,
               'description_es', dx.description_es,
               'is_preferred', pd.is_preferred
             ) ORDER BY pd.is_preferred DESC, dx.code)
      FROM   hema.protocol_diagnoses pd
      JOIN   hema.diagnoses dx ON dx.code = pd.diagnosis_code
      WHERE  pd.protocol_id = p.id
    ), '[]'::jsonb) AS diagnoses,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', pdr.id,
               'drug_id', pdr.drug_id,
               'inn', d.inn,
               'dose_value', pdr.dose_value,
               'dose_unit', pdr.dose_unit,
               'route', pdr.route,
               'days_of_cycle', pdr.days_of_cycle,
               'max_dose_mg', pdr.max_dose_mg,
               'infusion_minutes', pdr.infusion_minutes,
               'vehicle', pdr.vehicle,
               'premed_required', pdr.premed_required,
               'sequence_order', pdr.sequence_order,
               'is_anthracycline', d.is_anthracycline,
               'cyp3a4_substrate', d.cyp3a4_substrate,
               'cumulative_max_mg_m2', d.cumulative_max_mg_m2,
               'requires_test_dose', d.requires_test_dose
             ) ORDER BY pdr.sequence_order NULLS LAST, d.inn)
      FROM   hema.protocol_drugs pdr
      JOIN   hema.drugs d ON d.id = pdr.drug_id
      WHERE  pdr.protocol_id = p.id
    ), '[]'::jsonb) AS drugs
  FROM hema.protocols p
  LEFT JOIN hema.users     hu  ON hu.id = p.approved_by_medical_director
  LEFT JOIN public.doctors doc ON doc.id = hu.doctor_id
  WHERE p.id = p_protocol_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. hema_create_order — INSERT atómico de orden + fármacos de orden
--    SECURITY INVOKER: confía en RLS (orders_tenant_isolation,
--    order_drugs_tenant_isolation), mismo patrón que hema_create_patient.
--    p_drugs: jsonb array de objetos
--      { protocol_drug_id, drug_id, computed_dose_mg, base_dose_mg,
--        reduction_pct, reduction_reason, route, infusion_minutes,
--        vehicle, given_on_day, warnings, override_reason }
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_create_order(
  p_tenant_id      uuid,
  p_patient_id     uuid,
  p_protocol_id    uuid,
  p_diagnosis_code text,
  p_cycle_number   int,
  p_day_of_cycle   int,
  p_measurement_id uuid,
  p_bsa_used       numeric,
  p_bsa_formula    text,
  p_scheduled_for  date,
  p_created_by     uuid,
  p_drugs          jsonb,
  p_ecog           int  DEFAULT NULL,
  p_lab_panel_id   uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_order_id uuid;
  v_drug     jsonb;
BEGIN
  INSERT INTO hema.orders (
    tenant_id, patient_id, protocol_id, diagnosis_code, cycle_number, day_of_cycle,
    measurement_id, lab_panel_id, bsa_used, bsa_formula, ecog, scheduled_for,
    status, created_by
  ) VALUES (
    p_tenant_id, p_patient_id, p_protocol_id, p_diagnosis_code, p_cycle_number, p_day_of_cycle,
    p_measurement_id, p_lab_panel_id, p_bsa_used, p_bsa_formula, p_ecog, p_scheduled_for,
    'validated', p_created_by
  )
  RETURNING id INTO v_order_id;

  FOR v_drug IN SELECT * FROM jsonb_array_elements(p_drugs) LOOP
    INSERT INTO hema.order_drugs (
      order_id, protocol_drug_id, drug_id, computed_dose_mg, base_dose_mg,
      reduction_pct, reduction_reason, route, infusion_minutes, vehicle,
      given_on_day, warnings, override_reason
    ) VALUES (
      v_order_id,
      (v_drug->>'protocol_drug_id')::uuid,
      (v_drug->>'drug_id')::uuid,
      (v_drug->>'computed_dose_mg')::numeric,
      (v_drug->>'base_dose_mg')::numeric,
      COALESCE((v_drug->>'reduction_pct')::numeric, 0),
      v_drug->>'reduction_reason',
      v_drug->>'route',
      (v_drug->>'infusion_minutes')::int,
      v_drug->>'vehicle',
      (v_drug->>'given_on_day')::int,
      COALESCE(v_drug->'warnings', '[]'::jsonb),
      v_drug->>'override_reason'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.hema_get_protocol(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_create_order(
  uuid, uuid, uuid, text, int, int, uuid, numeric, text, date, uuid, jsonb, int, uuid
) TO authenticated;
