-- Banner de invitacion a COFEPRIS: si el medico elige "No, gracias"
-- explicitamente, no se le vuelve a mostrar. Si solo cierra el banner con
-- la X, esta columna se queda en false y el banner reaparece en su
-- siguiente visita a /dashboard (logica vive en el cliente) -- mismo
-- patron que webauthn_banner_declined (20260813000001).
alter table doctors
  add column if not exists cofepris_banner_declined boolean not null default false;
