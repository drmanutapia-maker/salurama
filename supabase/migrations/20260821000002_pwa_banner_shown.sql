-- Banner de "instalar como app" (PWA): se muestra una sola vez en la vida de
-- cada cuenta (medico o paciente), justo despues de su primera cita
-- confirmada/agendada. Mismo patron que webauthn_banner_declined
-- (20260813000001) pero sin opcion de "declinar" separada -- aqui "mostrado"
-- y "ya no volver a mostrar" son el mismo evento (ver InstalarAppBanner.tsx).
alter table doctors
  add column if not exists pwa_banner_shown boolean not null default false;

alter table pacientes
  add column if not exists pwa_banner_shown boolean not null default false;
