-- Fase 1 · 0009: project_expenses + business_expenses
create table public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  concept text not null,
  category public.project_expense_category not null default 'otros',
  amount numeric(12, 2) not null check (amount >= 0),
  incurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_project_expenses_updated_at
  before update on public.project_expenses
  for each row execute function public.set_updated_at();

create table public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  concept text not null,
  category public.business_expense_category not null default 'otros',
  amount numeric(12, 2) not null check (amount >= 0),   -- Importe por periodo
  recurrence public.expense_recurrence not null default 'unico',
  starts_on date not null default current_date,
  ends_on date,                             -- Nulable = sigue activo
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_expenses_ends_after_starts check (ends_on is null or ends_on >= starts_on)
);

create trigger set_business_expenses_updated_at
  before update on public.business_expenses
  for each row execute function public.set_updated_at();
