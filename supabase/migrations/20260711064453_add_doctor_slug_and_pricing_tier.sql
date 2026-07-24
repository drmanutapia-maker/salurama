-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-11,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.

-- Backfill slugs para los 4 médicos existentes (formato: {titulo}-{nombre}-{especialidad})
update doctors set slug = 'dr-stefania-suniva-rivera-perez-medicina-familiar' where id = '5666ee58-6cfd-452e-9a34-dd1bc442fdcd';
update doctors set slug = 'dr-armando-j-santacruz-perez-neumologia' where id = 'f19fb77e-dc25-48e9-83f4-afc6eb19701a';
update doctors set slug = 'dr-manuel-augusto-tapia-davila-hematologia' where id = '5fd15462-e0c6-476b-a9b7-c80575f611a2';
update doctors set slug = 'dr-manu-dav-hematologia' where id = 'b98f1737-6855-4fc0-8386-441eb3534aae';

-- A partir de aquí todo médico nuevo se crea con slug (ver app/api/registro-medico/route.ts)
alter table doctors alter column slug set not null;
alter table doctors add constraint doctors_slug_unique unique (slug);

-- Nivel de pricing de Salurama (Gratis/$349/$799/$1,999 MXN) — separado de la tabla
-- subscriptions, que es del módulo HEMA. Nombres alineados a los precios actuales
-- del documento de pricing; si cambian los montos, renombrar valores permitidos aquí.
alter table doctors add column pricing_tier text not null default 'gratis'
  check (pricing_tier in ('gratis', '349', '799', '1999'));
