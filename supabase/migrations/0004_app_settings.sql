-- Fase 1 · 0004: app_settings + creación automática al registrar usuario
create table public.app_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Madrid',
  vat_enabled boolean not null default false,          -- D-17
  vat_default_rate numeric(5, 2) not null default 21.00,
  target_hourly_rate numeric(10, 2),                   -- Alimenta M1 y M23
  wip_limit smallint not null default 3,               -- Aviso en M20 si se supera
  reminder_time time not null default '09:00',         -- Hora del aviso de cobro
  reminder_days_before smallint not null default 0,
  ics_token text not null default encode(gen_random_bytes(24), 'hex'),  -- D-13
  google_calendar_id text,                             -- Id de "Cobros · CRM"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Crea la fila de ajustes automáticamente al registrarse el usuario
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
