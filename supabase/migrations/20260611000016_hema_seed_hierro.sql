-- HEMA Módulo: Hierro IV – columna, CIE-10, fármacos y protocolos
-- Afecta schema: hema
-- Reversión:
--   DELETE FROM hema.protocol_drugs
--     WHERE protocol_id IN (SELECT id FROM hema.protocols WHERE line_of_therapy = 'hierro_iv');
--   DELETE FROM hema.protocols WHERE line_of_therapy = 'hierro_iv';
--   DELETE FROM hema.drugs WHERE inn IN (
--     'hierro sacarosa','carboximaltosa férrica','dextrano de hierro',
--     'hierro isomaltósido','gluconato férrico sódico');
--   DELETE FROM hema.diagnoses WHERE code IN ('D50.0','D50.1','D50.8','D50.9','D63.0','D63.1','D63.8');
--   ALTER TABLE hema.drugs DROP COLUMN IF EXISTS requires_test_dose;

-- ═══════════════════════════════════════════════════════════
-- PARTE 1: Nueva columna en hema.drugs
-- ═══════════════════════════════════════════════════════════

ALTER TABLE hema.drugs
  ADD COLUMN IF NOT EXISTS requires_test_dose boolean DEFAULT false;

COMMENT ON COLUMN hema.drugs.requires_test_dose IS
  'true = requiere dosis de prueba antes de la dosis completa. '
  'Aplica a dextrano de hierro: 25 mg en 15 min, observar 15 min, '
  'luego continuar si no hay reacción. Regla R-HIERRO-01 del validador.';

-- ═══════════════════════════════════════════════════════════
-- PARTE 2: CIE-10 anemias e hierro
-- ═══════════════════════════════════════════════════════════

INSERT INTO hema.diagnoses (code, description_es, description_en, category) VALUES
('D50.0', 'Anemia por deficiencia de hierro secundaria a pérdida de sangre crónica',
          'Iron deficiency anemia secondary to blood loss (chronic)', 'otro'),
('D50.1', 'Anemia sideropénica disfágica (síndrome de Plummer-Vinson)',
          'Sideropenic dysphagia', 'otro'),
('D50.8', 'Otras anemias por deficiencia de hierro',
          'Other iron deficiency anemias', 'otro'),
('D50.9', 'Anemia por deficiencia de hierro no especificada',
          'Iron deficiency anemia, unspecified', 'otro'),
('D63.0', 'Anemia en neoplasia maligna',
          'Anemia in neoplastic disease', 'otro'),
('D63.1', 'Anemia en enfermedad renal crónica',
          'Anemia in chronic kidney disease', 'otro'),
('D63.8', 'Anemia en otras enfermedades crónicas clasificadas en otra parte',
          'Anemia in other chronic diseases classified elsewhere', 'otro')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PARTE 3: Fármacos de hierro IV
-- ═══════════════════════════════════════════════════════════

INSERT INTO hema.drugs (
  inn, trade_names, atc_code,
  is_anthracycline, is_vesicant, cumulative_max_mg_m2,
  cyp3a4_substrate, cyp3a4_strong_inhibitor,
  requires_hbv_screen, requires_pft, requires_test_dose
) VALUES
('hierro sacarosa',
 ARRAY['Venofer'], 'B03AC02',
 false, false, NULL, false, false, false, false, false),

('carboximaltosa férrica',
 ARRAY['Ferinject','Injectafer'], 'B03AC01',
 false, false, NULL, false, false, false, false, false),

('dextrano de hierro',
 ARRAY['Cosmofer','INFeD'], 'B03AC06',
 false, false, NULL, false, false, false, false, true),

('hierro isomaltósido',
 ARRAY['Monofer','Monoferric'], 'B03AC09',
 false, false, NULL, false, false, false, false, false),

('gluconato férrico sódico',
 ARRAY['Ferrlecit'], 'B03AC03',
 false, false, NULL, false, false, false, false, false)
ON CONFLICT (inn) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PARTE 4: Protocolos de hierro IV con sus fármacos
-- Usa DO $$ para manejar los IDs generados sin exponer UUIDs hardcodeados.
-- ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code → upsert idempotente
-- que siempre devuelve el id via RETURNING, incluso si ya existía el protocolo.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  v_drug_id  uuid;
  v_proto_id uuid;
BEGIN

  -- ── HIERRO-SAC: Hierro Sacarosa 200 mg ──────────────────────────
  INSERT INTO hema.protocols (code, name, cycle_length_days, specialty, active, line_of_therapy)
  VALUES ('HIERRO-SAC', 'Hierro Sacarosa IV 200 mg (Venofer)', 1, 'hematologia', false, 'hierro_iv')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_proto_id;

  SELECT id INTO v_drug_id FROM hema.drugs WHERE inn = 'hierro sacarosa';

  IF v_drug_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hema.protocol_drugs WHERE protocol_id = v_proto_id
  ) THEN
    INSERT INTO hema.protocol_drugs (
      protocol_id, drug_id, dose_value, dose_unit, route,
      days_of_cycle, infusion_minutes, vehicle, sequence_order
    ) VALUES (
      v_proto_id, v_drug_id, 200, 'mg', 'IV',
      ARRAY[1], 30, 'Salina 0.9% 100ml', 1
    );
  END IF;

  -- ── HIERRO-CARBX: Carboximaltosa Férrica 1000 mg ────────────────
  INSERT INTO hema.protocols (code, name, cycle_length_days, specialty, active, line_of_therapy)
  VALUES ('HIERRO-CARBX', 'Carboximaltosa Férrica IV 1000 mg (Ferinject)', 1, 'hematologia', false, 'hierro_iv')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_proto_id;

  SELECT id INTO v_drug_id FROM hema.drugs WHERE inn = 'carboximaltosa férrica';

  IF v_drug_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hema.protocol_drugs WHERE protocol_id = v_proto_id
  ) THEN
    INSERT INTO hema.protocol_drugs (
      protocol_id, drug_id, dose_value, dose_unit, route,
      days_of_cycle, infusion_minutes, vehicle, sequence_order
    ) VALUES (
      v_proto_id, v_drug_id, 1000, 'mg', 'IV',
      ARRAY[1], 15, 'Salina 0.9% 250ml', 1
    );
  END IF;

  -- ── HIERRO-DEXT: Dextrano de Hierro con dosis de prueba ─────────
  INSERT INTO hema.protocols (code, name, cycle_length_days, specialty, active, line_of_therapy)
  VALUES ('HIERRO-DEXT', 'Dextrano de Hierro IV con dosis de prueba (Cosmofer)', 1, 'hematologia', false, 'hierro_iv')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_proto_id;

  SELECT id INTO v_drug_id FROM hema.drugs WHERE inn = 'dextrano de hierro';

  IF v_drug_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hema.protocol_drugs WHERE protocol_id = v_proto_id
  ) THEN
    -- Dosis de prueba: 25 mg IV en 15 min, observar antes de continuar
    INSERT INTO hema.protocol_drugs (
      protocol_id, drug_id, dose_value, dose_unit, route,
      days_of_cycle, infusion_minutes, sequence_order, premed_required
    ) VALUES (
      v_proto_id, v_drug_id, 25, 'mg', 'IV',
      ARRAY[1], 15, 1,
      '{"observacion": "15 min post-prueba antes de continuar"}'::jsonb
    );
    -- Dosis completa: 500 mg IV en 180 min
    INSERT INTO hema.protocol_drugs (
      protocol_id, drug_id, dose_value, dose_unit, route,
      days_of_cycle, infusion_minutes, sequence_order
    ) VALUES (
      v_proto_id, v_drug_id, 500, 'mg', 'IV',
      ARRAY[1], 180, 2
    );
  END IF;

  -- ── HIERRO-ISO: Hierro Isomaltósido 20 mg/kg ────────────────────
  INSERT INTO hema.protocols (code, name, cycle_length_days, specialty, active, line_of_therapy)
  VALUES ('HIERRO-ISO', 'Hierro Isomaltósido IV 20 mg/kg (Monofer)', 1, 'hematologia', false, 'hierro_iv')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_proto_id;

  SELECT id INTO v_drug_id FROM hema.drugs WHERE inn = 'hierro isomaltósido';

  IF v_drug_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hema.protocol_drugs WHERE protocol_id = v_proto_id
  ) THEN
    INSERT INTO hema.protocol_drugs (
      protocol_id, drug_id, dose_value, dose_unit, route,
      days_of_cycle, infusion_minutes, vehicle, sequence_order
    ) VALUES (
      v_proto_id, v_drug_id, 20, 'mg/kg', 'IV',
      ARRAY[1], 30, 'Salina 0.9% 100ml', 1
    );
  END IF;

  -- ── HIERRO-GLUC: Gluconato Férrico Sódico 125 mg ────────────────
  INSERT INTO hema.protocols (code, name, cycle_length_days, specialty, active, line_of_therapy)
  VALUES ('HIERRO-GLUC', 'Gluconato Férrico Sódico IV 125 mg (Ferrlecit)', 1, 'hematologia', false, 'hierro_iv')
  ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
  RETURNING id INTO v_proto_id;

  SELECT id INTO v_drug_id FROM hema.drugs WHERE inn = 'gluconato férrico sódico';

  IF v_drug_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hema.protocol_drugs WHERE protocol_id = v_proto_id
  ) THEN
    INSERT INTO hema.protocol_drugs (
      protocol_id, drug_id, dose_value, dose_unit, route,
      days_of_cycle, infusion_minutes, vehicle, sequence_order
    ) VALUES (
      v_proto_id, v_drug_id, 125, 'mg', 'IV',
      ARRAY[1], 60, 'Salina 0.9% 100ml', 1
    );
  END IF;

END;
$$;

-- ═══════════════════════════════════════════════════════════
-- NOTA PARA EL MOTOR DE VALIDACIÓN — implementar en Sesión 6
-- ═══════════════════════════════════════════════════════════
-- R-HIERRO-01: Si protocol contiene dextrano de hierro (requires_test_dose=true)
-- y no existe order_drug previa del mismo día con sequence_order=1 completada,
-- el motor debe BLOQUEAR la dosis completa (sequence_order=2).
-- Implementar en packages/hema-validator/src/rules/r-iron.ts en Sesión 6.
