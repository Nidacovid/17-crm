-- Fase 1 · 0010: payments + índices
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  seq smallint not null,                   -- 1 = entrada
  label text,                              -- "Entrada", "Plazo 2 de 3", ... Generado, editable
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  paid_at date,                            -- null = pendiente
  method text,                             -- Transferencia, Bizum, ... Opcional
  google_event_id text,                    -- Id del evento en Google Calendar (D-12)
  sync_state public.sync_state not null default 'pendiente',
  sync_error text,                         -- Último mensaje de error de sincronización
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_project_seq_uniq on public.payments (project_id, seq);
create index payments_owner_due_date_idx on public.payments (owner_id, due_date);
create index payments_owner_paid_at_idx on public.payments (owner_id, paid_at);
create index payments_owner_due_pending_idx
  on public.payments (owner_id, due_date)
  where paid_at is null;

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
