-- HEMA: corrige la firma de net.http_post en el trigger de validación clínica.
-- Bug: body := v_order_input::text castea jsonb→text, pero net.http_post
-- espera body jsonb. Postgres no encuentra la sobrecarga y falla con
-- "function net.http_post(url => text, headers => jsonb, body => text) does not exist".
-- Fix: quitar el cast — v_order_input ya es jsonb.
-- Afecta schema: hema (función del trigger), no toca datos
-- Reversión: revertir a la versión de 20260615000004_hema_trigger_validate.sql

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
    RAISE WARNING 'hema.validate_order_before_insert: No se pudo leer Vault: %', SQLERRM;
    RETURN NEW;
  END;

  IF v_service_role_key IS NULL THEN
    RAISE WARNING 'hema.validate_order_before_insert: hema_service_role_key no encontrado en Vault. INSERT permitido sin validación.';
    RETURN NEW;
  END IF;

  -- ── Construir OrderInput mínimo desde la fila NEW ──────────────────────────
  v_order_input := jsonb_build_object(
    'patient', jsonb_build_object(
      'bsa_mosteller', NEW.bsa_used,
      'bsa_dubois',    NEW.bsa_used,
      'weight_kg',     70,
      'height_cm',     170,
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
    body    := v_order_input,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    )
  ) INTO v_request_id;

  -- Esperar respuesta (pg_net async → reintento síncrono mínimo)
  PERFORM pg_sleep(0.5);

  SELECT status_code, content
  INTO   v_response_status, v_response_body
  FROM   net._http_response
  WHERE  id = v_request_id
  LIMIT  1;

  IF v_response_status IS NULL THEN
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

-- El trigger ya existe y apunta a esta función — no hace falta recrearlo.
