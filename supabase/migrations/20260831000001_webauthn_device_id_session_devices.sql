-- Vincula credenciales WebAuthn con su dispositivo real, independiente del
-- texto de user-agent (que puede repetirse en dos máquinas distintas) y de
-- session_id (efímero: se destruye en cada logout). device_id es un UUID
-- persistente generado en el cliente (localStorage), enviado tanto al
-- registrar una huella como al iniciar sesión.

alter table webauthn_credentials add column if not exists device_id text;

comment on column webauthn_credentials.device_id is
  'UUID persistente en localStorage del navegador, generado en el cliente antes de registrar la credencial. Permite fusionar esta credencial con su sesión real en /dashboard/seguridad sin depender de comparar el texto de user-agent. NULL en credenciales registradas antes de este cambio -- se completa solo cuando el médico vuelve a registrar la huella.';

-- session_devices: mapa (session_id -> device_id) que la propia app llena al
-- iniciar sesión (contraseña o biométrico). auth.sessions es de Supabase Auth
-- y no tiene espacio para nuestro device_id, así que se guarda aparte.
create table if not exists session_devices (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  medico_id  uuid not null references doctors(id) on delete cascade,
  device_id  text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_devices_medico_device on session_devices(medico_id, device_id);

comment on table session_devices is
  'Vincula una sesión real de auth.sessions con el device_id persistente de su navegador. Se borra sola cuando la sesión se cierra/revoca (ON DELETE CASCADE). Usado para fusionar sesión + credencial WebAuthn del mismo dispositivo en /dashboard/seguridad.';

-- Mismo criterio que chat_mensajes/chat_archivos/push_subscriptions/
-- webauthn_credentials: RLS habilitado sin políticas, acceso exclusivo vía
-- service role desde los endpoints server-side (que ya verifican la sesión
-- real antes de tocar esta tabla).
alter table session_devices enable row level security;
