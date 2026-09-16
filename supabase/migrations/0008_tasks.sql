-- Fase 1 · 0008: tasks + tasks_cost_allowed + índice único de fase + trigger de fechas
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase public.task_phase,                 -- Nulable: null = tarea personalizada (D-22)
  title text not null,
  status public.task_status not null default 'todo',
  position numeric not null,               -- Orden dentro de la columna del kanban
  minutes integer check (minutes is null or minutes >= 0),      -- D-01
  cost_eur numeric(10, 2) check (cost_eur is null or cost_eur >= 0),  -- D-03
  started_at timestamptz,                  -- Automático al pasar a doing (D-25)
  completed_at timestamptz,                -- Automático al pasar a done (D-25)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- D-04: solo 6 fases admiten coste; las personalizadas (phase null) también
  constraint tasks_cost_allowed check (
    cost_eur is null
    or phase is null
    or phase in ('planificacion', 'fases', 'bugs', 'ajustes', 'auditorias', 'retoques')
  )
);

-- Una sola tarea por fase y proyecto; las personalizadas no se limitan
create unique index tasks_project_phase_uniq
  on public.tasks (project_id, phase)
  where phase is not null;

create index tasks_owner_project_status_pos_idx on public.tasks (owner_id, project_id, status, position);
create index tasks_owner_completed_idx on public.tasks (owner_id, completed_at);
create index tasks_owner_phase_idx on public.tasks (owner_id, phase);

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- D-25: started_at / completed_at automáticos al cambiar de estado
create trigger set_tasks_timestamps
  before insert or update on public.tasks
  for each row execute function public.set_task_timestamps();
