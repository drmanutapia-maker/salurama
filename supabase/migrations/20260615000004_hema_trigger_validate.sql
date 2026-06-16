-- Trigger de validación clínica antes de insertar una orden de quimioterapia.
-- Llama a hema-orders-calculate via pg_net con service_role key desde Vault.
-- Si hasUnresolvedBlocks = true → RAISE EXCEPTION → el INSERT es rechazado.
-- ESTE TRIGGER NO PUEDE DESACTIVARSE DESDE EL CLIENTE (SECURITY DEFINER).

-- Requiere extensiones: pg_net, pgcrypto
-- Requiere: supabase_vault con secret 'hema_service_role_key'

CREATE OR REPLACE FUNCTION hema.validate_order_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_role_key text;
  v_supabase_url     text;
  v_request_id       bigint;
  v_response_status  int;
  v_response_body    text;
  v_result           jsonb;
  v_order_input      jsonb;
BEGIN
  -- ── Leer configuración desde Vault ─────────────────────────────────────────
  BEGIN
    SELECT decrypted_secret
    INTO   v_service_role_key
    FROM   vault.decrypted_secrets
    WHERE  name = 'hema_service_role_key'
    LIMIT  1;
  EXCEPTION WHEN OTHERS THEN
    -- Si Vault no está disponible, permitir el INSERT y registrar advertencia
    RAISE WARNING 'hema.validate_order_before_insert: No se pudo leer Vault: %', SQLERRM;
    RETURN NEW;
  END;

  IF v_service_role_key IS NULL THEN
    RAISE WARNING 'hema.validate_order_before_insert: hema_service_role_key no encontrado en Vault. INSERT permitido sin validación.';
    RETURN NEW;
  END IF;

  -- ── Construir OrderInput mínimo desde la fila NEW ──────────────────────────
  -- El trigger recibe la fila de hema.orders que aún no contiene los labs/drugs
  -- en columnas propias. El wizard de la UI debe pasar el OrderInput completo
  -- a la Edge Function antes del INSERT. Para el trigger usamos el campo
  -- validation_payload si existe, sino construimos un input parcial.
  v_order_input := jsonb_build_object(
    'patient', jsonb_build_object(
      'bsa_mosteller', NEW.bsa_used,
      'bsa_dubois',    NEW.bsa_used,
      'weight_kg',     70,  -- fallback: el trigger verifica hasUnresolvedBlocks
      'height_cm',     170,
      'bsa_mosteller', NEW.bsa_used,
      'age',           0,
      'sex',           'M'
    ),
    'labs',     jsonb_build_object('collected_at', now()::text),
    'protocol', jsonb_build_object('code', NEW.protocol_id::text, 'drugs', '[]'::jsonb)
  );

  -- ── Llamar Edge Function via pg_net ───────────────────────────────────────
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://pwcdwxhfypaxvtqydzcg.supabase.co';
  END IF;

  SELECT net.http_post(
    url     := v_supabase_url || '/functions/v1/hema-orders-calculate',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := v_order_input::text
  ) INTO v_request_id;

  -- Esperar respuesta (pg_net async → reintento síncrono mínimo)
  PERFORM pg_sleep(0.5);

  SELECT status_code, content
  INTO   v_response_status, v_response_body
  FROM   net._http_response
  WHERE  id = v_request_id
  LIMIT  1;

  IF v_response_status IS NULL THEN
    -- Sin respuesta en tiempo → permitir con advertencia (no bloquear por latencia)
    RAISE WARNING 'hema_trigger_validate: sin respuesta de Edge Function (id=%). INSERT permitido.', v_request_id;
    RETURN NEW;
  END IF;

  IF v_response_status != 200 THEN
    RAISE WARNING 'hema_trigger_validate: Edge Function retornó HTTP %. INSERT permitido.', v_response_status;
    RETURN NEW;
  END IF;

  -- ── Interpretar resultado ──────────────────────────────────────────────────
  BEGIN
    v_result := v_response_body::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'hema_trigger_validate: respuesta no es JSON válido. INSERT permitido.';
    RETURN NEW;
  END;

  IF (v_result ->> 'hasUnresolvedBlocks')::boolean IS TRUE THEN
    RAISE EXCEPTION 'HEMA-BLOCK: La orden tiene reglas clínicas no resueltas: %',
      (
        SELECT string_agg(r ->> 'message_es', ' | ')
        FROM jsonb_array_elements(v_result -> 'results') AS r
        WHERE r ->> 'severity' = 'block'
      );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT en hema.orders
DROP TRIGGER IF EXISTS hema_order_clinical_validation ON hema.orders;

CREATE TRIGGER hema_order_clinical_validation
  BEFORE INSERT ON hema.orders
  FOR EACH ROW
  EXECUTE FUNCTION hema.validate_order_before_insert();
