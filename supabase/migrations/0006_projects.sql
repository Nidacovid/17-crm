-- Fase 1 · 0006: projects + secuencia de códigos + triggers
create sequence public.project_code_seq start 1;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  code text not null unique,               -- PRJ-0001, generado por trigger
  name text not null,
  level smallint not null default 1 check (level in (1, 2)),
  status public.project_status not null default 'a_empezar',
  price_net numeric(12, 2) not null default 0,   -- Sin IVA (D-17)
  vat_rate numeric(5, 2) not null default 0,
  estimated_hours numeric(6, 2),           -- Opcional (D-29), alimenta M11
  payment_mode public.payment_mode not null default 'unico',
  installments smallint check (installments is null or installments between 1 and 60),
  down_payment numeric(12, 2),             -- "Entrada". Se materializa como payments.seq = 1
  started_at date,                         -- Automática al pasar a en_desarrollo
  delivered_at date,                       -- Automática al pasar a terminado
  cancelled_at timestamptz,                -- Se rellena al archivar (D-10)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_status_idx on public.projects (owner_id, status);
create index projects_owner_client_idx on public.projects (owner_id, client_id);
create index projects_owner_created_idx on public.projects (owner_id, created_at desc);

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Código legible PRJ-0001
create trigger set_projects_code
  before insert on public.projects
  for each row execute function public.set_project_code();

-- started_at / delivered_at / cancelled_at automáticos al cambiar de estado
create trigger set_projects_timestamps
  before insert or update on public.projects
  for each row execute function public.set_project_timestamps();

-- D-21: al crear un proyecto nacen siempre sus 9 tareas
create trigger seed_projects_tasks
  after insert on public.projects
  for each row execute function public.seed_project_tasks();
