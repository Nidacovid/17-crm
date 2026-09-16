-- Fase 1 · 0012: RLS en todas las tablas públicas (regla 2.1.1)
-- Política única por tabla: owner_id = auth.uid()
alter table public.app_settings      enable row level security;
alter table public.clients           enable row level security;
alter table public.client_notes      enable row level security;
alter table public.projects          enable row level security;
alter table public.documents         enable row level security;
alter table public.tasks             enable row level security;
alter table public.project_expenses  enable row level security;
alter table public.business_expenses enable row level security;
alter table public.payments          enable row level security;

create policy app_settings_owner on public.app_settings
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy clients_owner on public.clients
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy client_notes_owner on public.client_notes
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy projects_owner on public.projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy documents_owner on public.documents
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy tasks_owner on public.tasks
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy project_expenses_owner on public.project_expenses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy business_expenses_owner on public.business_expenses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy payments_owner on public.payments
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
