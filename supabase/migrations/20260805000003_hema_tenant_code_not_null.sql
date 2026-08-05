-- HEMA: tenant_code pasa a NOT NULL — cierra el punto 5 de la auditoría de
-- seguridad (2026-08-05). La columna se agregó nullable "por ahora" en
-- 20260630000001_hema_tenant_fields.sql, con la condición explícita de
-- pasarla a NOT NULL una vez que todos los tenants activos tuvieran el
-- valor. Hoy el único tenant real (LARAZA) ya lo tiene, así que la
-- condición se cumple: sin este cambio, nada impedía que un tenant nuevo
-- se diera de alta a mano (no hay flujo de app para crearlos) sin
-- tenant_code, dejando su número de expediente sin el prefijo
-- institucional en silencio.
-- Reversión:
--   ALTER TABLE hema.tenants ALTER COLUMN tenant_code DROP NOT NULL;

ALTER TABLE hema.tenants
  ALTER COLUMN tenant_code SET NOT NULL;
