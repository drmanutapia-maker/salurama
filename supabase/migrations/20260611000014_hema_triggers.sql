-- HEMA Módulo: Triggers de auditoría + validación clínica pre-INSERT
-- Afecta schema: hema
-- Reversión: DROP TRIGGER ... ON hema.[tabla];
--            DROP FUNCTION hema.audit_trigger_function();
--            DROP FUNCTION hema.validate_order_before_insert();
--            DROP FUNCTION hema.update_cumulative_doses();

-- ═══════════════════════════════════════════════════════════
-- PARTE 1: Trigger de auditoría universal
-- (sin cambios respecto a la versión anterior)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION hema.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id   uuid;
  v_entity_id   uuid;
  v_before_json jsonb;
  v_after_json  jsonb;
  v_prev_hash   text;
  v_row_hash    text;
BEGIN
  v_tenant_id := COALESCE(
    (to_jsonb(NEW) ->> 'tenant_id')::uuid,
    (to_jsonb(OLD) ->> 'tenant_id')::uuid
  );
  v_entity_id := COALESCE(
    (to_jsonb(NEW) ->> 'id')::uuid,
    (to_jsonb(OLD) ->> 'id')::uuid
  );
  IF TG_OP = 'INSERT' THEN
    v_before_json := NULL;
    v_after_json  := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before_json := to_jsonb(OLD);
    v_after_json  := to_jsonb(NEW);
  ELSE
    v_before_json := to_jsonb(OLD);
    v_after_json  := NULL;
  END IF;
  SELECT row_hash INTO v_prev_hash
  FROM hema.audit_log
  WHERE entity = TG_TABLE_NAME AND entity_id = v_entity_id
  ORDER BY id DESC LIMIT 1;
  v_row_hash := encode(
    digest(
      COALESCE(v_prev_hash, '') ||
      TG_OP || TG_TABLE_NAME ||
      COALESCE(v_entity_id::text, '') ||
      COALESCE(v_after_json::text, v_before_json::text, ''),
      'sha256'
    ),
    'hex'
  );
  INSERT INTO hema.audit_log (
    tenant_id, user_id, action, entity, entity_id,
    before_json, after_json, ip_address, user_agent,
    prev_row_hash, row_hash, created_at
  ) VALUES (
    v_tenant_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_entity_id,
    v_before_json, v_after_json,
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet,
    current_setting('request.headers', true)::jsonb ->> 'user-agent',
    v_prev_hash, v_row_hash, now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patients', 'patient_measurements', 'patient_diagnoses',
    'orders', 'order_drugs', 'cumulative_doses',
    'lab_panels', 'lab_values', 'signatures'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER hema_audit_%1$s
       AFTER INSERT OR UPDATE OR DELETE ON hema.%1$s
       FOR EACH ROW EXECUTE FUNCTION hema.audit_trigger_function()',
      t
    );
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- PARTE 2: Trigger de validación clínica BEFORE INSERT en órdenes
-- CAMBIO: usa Supabase Vault en lugar de current_setting()
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION hema.validate_order_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result           jsonb;
  v_has_blocks       boolean;
  v_message          text;
  v_project_url      text;
  v_service_role_key text;
BEGIN
  -- Leer configuración desde Vault (no expone valores en parámetros de DB)
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'hema_supabase_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'hema_service_role_key'
  LIMIT 1;

  -- Fallo ruidoso si los secretos no están cargados en Vault
  IF v_project_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE EXCEPTION
      'HEMA-CONFIG: Secretos hema_supabase_url / hema_service_role_key '
      'no encontrados en Vault. Ejecuta los vault.create_secret() indicados '
      'en el README de migraciones antes de insertar órdenes.';
  END IF;

  SELECT content::jsonb
  INTO v_result
  FROM net.http_post(
    url     := v_project_url || '/functions/v1/hema-orders-calculate',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := to_jsonb(NEW)::text
  );

  v_has_blocks := COALESCE((v_result ->> 'hasUnresolvedBlocks')::boolean, false);

  IF v_has_blocks THEN
    v_message := COALESCE(
      v_result ->> 'blockMessage',
      'La orden tiene reglas clínicas bloqueantes sin resolver.'
    );
    RAISE EXCEPTION 'HEMA-BLOCK: %', v_message;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER hema_order_clinical_validation
  BEFORE INSERT ON hema.orders
  FOR EACH ROW EXECUTE FUNCTION hema.validate_order_before_insert();

COMMENT ON FUNCTION hema.validate_order_before_insert() IS
  'Segunda capa de bloqueo clínico. Lee URL y service_role_key desde '
  'Supabase Vault (vault.decrypted_secrets) — nunca de parámetros de DB '
  'ni de archivos del repo. Requiere secretos hema_supabase_url y '
  'hema_service_role_key cargados previamente con vault.create_secret().';

-- ═══════════════════════════════════════════════════════════
-- PARTE 3: Trigger para actualizar cumulative_doses
-- (sin cambios)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION hema.update_cumulative_doses()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'administered' AND OLD.status <> 'administered' THEN
    INSERT INTO hema.cumulative_doses (patient_id, drug_id, cumulative_mg_m2, last_dose_at)
    SELECT
      NEW.patient_id,
      od.drug_id,
      od.computed_dose_mg / NULLIF(NEW.bsa_used, 0),
      now()
    FROM hema.order_drugs od
    WHERE od.order_id = NEW.id
    ON CONFLICT (patient_id, drug_id) DO UPDATE
      SET cumulative_mg_m2 = hema.cumulative_doses.cumulative_mg_m2
                             + EXCLUDED.cumulative_mg_m2,
          last_dose_at     = EXCLUDED.last_dose_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hema_update_cumulative_on_administered
  AFTER UPDATE OF status ON hema.orders
  FOR EACH ROW EXECUTE FUNCTION hema.update_cumulative_doses();
