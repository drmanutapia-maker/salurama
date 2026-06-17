-- HEMA: Funciones RPC de seed (escritura) para hema.drugs / protocols / protocol_diagnoses / protocol_drugs
-- Afecta schema: public (funciones) — internamente escriben en schema hema
-- Restringidas a service_role: NO se otorgan a authenticated (uso exclusivo de scripts de seed/admin)
-- Reversión: DROP FUNCTION public.hema_seed_upsert_drug, public.hema_seed_upsert_protocol,
--            public.hema_seed_replace_protocol_diagnoses, public.hema_seed_replace_protocol_drugs;

-- ─────────────────────────────────────────────────────────────────────────────
-- Upsert de fármaco por INN (clave natural única)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_seed_upsert_drug(
  p_inn                     text,
  p_trade_names             text[],
  p_atc_code                text,
  p_is_anthracycline        boolean,
  p_is_vesicant             boolean,
  p_cumulative_max_mg_m2    numeric,
  p_cyp3a4_substrate        boolean,
  p_cyp3a4_strong_inhibitor boolean,
  p_requires_hbv_screen     boolean,
  p_requires_pft            boolean,
  p_requires_test_dose      boolean DEFAULT false
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO hema.drugs (
    inn, trade_names, atc_code, is_anthracycline, is_vesicant,
    cumulative_max_mg_m2, cyp3a4_substrate, cyp3a4_strong_inhibitor,
    requires_hbv_screen, requires_pft, requires_test_dose
  )
  VALUES (
    p_inn, p_trade_names, p_atc_code, p_is_anthracycline, p_is_vesicant,
    p_cumulative_max_mg_m2, p_cyp3a4_substrate, p_cyp3a4_strong_inhibitor,
    p_requires_hbv_screen, p_requires_pft, p_requires_test_dose
  )
  ON CONFLICT (inn) DO UPDATE SET
    trade_names             = EXCLUDED.trade_names,
    atc_code                = EXCLUDED.atc_code,
    is_anthracycline        = EXCLUDED.is_anthracycline,
    is_vesicant              = EXCLUDED.is_vesicant,
    cumulative_max_mg_m2     = EXCLUDED.cumulative_max_mg_m2,
    cyp3a4_substrate         = EXCLUDED.cyp3a4_substrate,
    cyp3a4_strong_inhibitor  = EXCLUDED.cyp3a4_strong_inhibitor,
    requires_hbv_screen      = EXCLUDED.requires_hbv_screen,
    requires_pft             = EXCLUDED.requires_pft,
    requires_test_dose       = EXCLUDED.requires_test_dose
  RETURNING id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Upsert de protocolo por code (clave natural única)
-- No toca active / approved_by_medical_director / approved_at en UPDATE:
-- re-sembrar no debe revertir una aprobación ya otorgada por el director médico.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_seed_upsert_protocol(
  p_code                text,
  p_name                text,
  p_cycle_length_days   int,
  p_total_cycles        int,
  p_line_of_therapy     text,
  p_specialty           text,
  p_active              boolean,
  p_protocol_references jsonb
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO hema.protocols (
    code, name, cycle_length_days, total_cycles, line_of_therapy,
    specialty, active, protocol_references
  )
  VALUES (
    p_code, p_name, p_cycle_length_days, p_total_cycles, p_line_of_therapy,
    p_specialty, p_active, p_protocol_references
  )
  ON CONFLICT (code) DO UPDATE SET
    name                = EXCLUDED.name,
    cycle_length_days   = EXCLUDED.cycle_length_days,
    total_cycles         = EXCLUDED.total_cycles,
    line_of_therapy      = EXCLUDED.line_of_therapy,
    specialty            = EXCLUDED.specialty,
    protocol_references  = EXCLUDED.protocol_references
  RETURNING id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reemplaza el set completo de diagnósticos vinculados a un protocolo
-- (borra + inserta dentro de la misma función = transaccional)
-- p_diagnoses: jsonb array [{code, is_preferred}, ...]
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_seed_replace_protocol_diagnoses(
  p_protocol_id uuid,
  p_diagnoses   jsonb
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM hema.protocol_diagnoses WHERE protocol_id = p_protocol_id;

  INSERT INTO hema.protocol_diagnoses (protocol_id, diagnosis_code, is_preferred)
  SELECT
    p_protocol_id,
    elem->>'code',
    COALESCE((elem->>'is_preferred')::boolean, false)
  FROM jsonb_array_elements(p_diagnoses) elem;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reemplaza el set completo de fármacos de un protocolo
-- protocol_drugs no tiene unique key natural (solo id) -> idempotencia vía
-- borrar + reinsertar el set completo del protocolo, transaccional.
-- p_drugs: jsonb array [{drug_id, dose_value, dose_unit, route, days_of_cycle,
--                        max_dose_mg, infusion_minutes, vehicle, premed_required,
--                        sequence_order}, ...]
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_seed_replace_protocol_drugs(
  p_protocol_id uuid,
  p_drugs       jsonb
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM hema.protocol_drugs WHERE protocol_id = p_protocol_id;

  INSERT INTO hema.protocol_drugs (
    protocol_id, drug_id, dose_value, dose_unit, route, days_of_cycle,
    max_dose_mg, infusion_minutes, vehicle, premed_required, sequence_order
  )
  SELECT
    p_protocol_id,
    (elem->>'drug_id')::uuid,
    (elem->>'dose_value')::numeric,
    elem->>'dose_unit',
    elem->>'route',
    ARRAY(SELECT jsonb_array_elements_text(elem->'days_of_cycle'))::int[],
    (elem->>'max_dose_mg')::numeric,
    (elem->>'infusion_minutes')::int,
    elem->>'vehicle',
    elem->'premed_required',
    (elem->>'sequence_order')::int
  FROM jsonb_array_elements(p_drugs) elem;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos — solo service_role (scripts de seed/admin), nunca authenticated
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.hema_seed_upsert_drug(
  text, text[], text, boolean, boolean, numeric, boolean, boolean, boolean, boolean, boolean
) TO service_role;

GRANT EXECUTE ON FUNCTION public.hema_seed_upsert_protocol(
  text, text, int, int, text, text, boolean, jsonb
) TO service_role;

GRANT EXECUTE ON FUNCTION public.hema_seed_replace_protocol_diagnoses(uuid, jsonb)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.hema_seed_replace_protocol_drugs(uuid, jsonb)
  TO service_role;
