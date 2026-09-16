-- Fase 1 · 0005: clients + client_notes, índices y triggers
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  business_name text not null,             -- Nombre que se muestra en todas partes
  contact_name text,
  phone text,                              -- Tal como se escribió
  phone_e164 text,                         -- Normalizado. Detección de duplicados
  email text,
  business_type text,                      -- Texto libre con autocompletado
  status public.client_status not null default 'potencial',
  notes text,                              -- Notas libres (distinto del log client_notes)
  last_contact_at date,                    -- Mantenido por trigger desde client_notes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_owner_business_name_idx on public.clients (owner_id, business_name);
create index clients_owner_status_idx on public.clients (owner_id, status);
create index clients_owner_business_type_idx on public.clients (owner_id, business_type);

create unique index clients_owner_phone_e164_uniq
  on public.clients (owner_id, phone_e164)
  where phone_e164 is not null;

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  note_date date not null default current_date,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index client_notes_owner_client_date_idx
  on public.client_notes (owner_id, client_id, note_date desc);

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- last_contact_at = fecha de la nota más reciente (insertar, editar o borrar)
create trigger client_notes_refresh_last_contact_on_insert
  after insert on public.client_notes
  for each row execute function public.refresh_client_last_contact();

create trigger client_notes_refresh_last_contact_on_update
  after update of client_id, note_date on public.client_notes
  for each row execute function public.refresh_client_last_contact();

create trigger client_notes_refresh_last_contact_on_delete
  after delete on public.client_notes
  for each row execute function public.refresh_client_last_contact();
