-- Fase 1 · 0011: esquema private + google_credentials (D-15)
create schema private;

create table private.google_credentials (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token_enc text,                  -- Cifrado AES-256-GCM
  access_token_enc text,                   -- Cifrado AES-256-GCM
  access_token_expires_at timestamptz,
  scope text,
  google_email text,                       -- Informativo: "Conectado como..."
  connected_at timestamptz,
  updated_at timestamptz
);

-- RLS habilitada y SIN ninguna política para authenticated: deniega todo.
-- Solo la clave de servicio (service_role, que ignora la RLS) puede acceder.
alter table private.google_credentials enable row level security;
