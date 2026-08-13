-- Credenciales biometricas (WebAuthn/passkeys) para login sin contrasena por
-- dispositivo. Nunca se guarda la huella/Face ID en si -- eso nunca sale del
-- dispositivo del medico. Lo unico que se guarda aqui es la llave PUBLICA
-- que el navegador entrega al registrar una credencial, mas metadatos para
-- poder verificar futuros inicios de sesion y detectar clonacion.
create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references doctors(id) on delete cascade,
  -- Base64url del ID de la credencial que entrega el autenticador -- unico
  -- por credencial, es lo primero que llega en cada intento de login y con
  -- lo que se busca esta fila (no se conoce el medico_id todavia en ese punto).
  credential_id text not null unique,
  -- Llave publica en formato COSE tal cual la entrega @simplewebauthn/server
  -- (registrationInfo.credential.publicKey) -- binario, no texto.
  public_key bytea not null,
  -- Contador de firmas que reporta el autenticador. Debe subir en cada login;
  -- si en un login llega igual o menor que el guardado, es senal de un
  -- clon de la credencial y el intento debe rechazarse.
  counter bigint not null default 0,
  transports text[],
  -- 'single_device' o 'multi_device' (ej. passkey sincronizada via iCloud/Google) --
  -- tal cual lo reporta @simplewebauthn/server, solo informativo por ahora.
  device_type text,
  backed_up boolean not null default false,
  -- Nombre para mostrarle al medico en /dashboard/seguridad (ej. "Chrome en Windows",
  -- derivado del user-agent al momento del registro, no del AAGUID).
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index idx_webauthn_credentials_medico_id on webauthn_credentials(medico_id);

comment on table webauthn_credentials is
  'Credenciales WebAuthn/passkey por dispositivo, para login biometrico. Solo se guarda la llave publica y metadatos -- nunca datos biometricos, esos nunca salen del dispositivo del medico.';
comment on column webauthn_credentials.counter is
  'Contador de firmas del autenticador. Un login con un contador igual o menor al guardado indica posible clonacion de la credencial y debe rechazarse.';

-- Mismo criterio que chat_mensajes/chat_archivos/push_subscriptions: RLS
-- habilitado sin politicas, acceso exclusivo via service role desde los
-- endpoints server-side (que verifican la sesion o el reto de WebAuthn antes
-- de tocar esta tabla).
alter table webauthn_credentials enable row level security;
