-- Fase 1 · 0007: documents + restricciones + índices únicos parciales
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  client_id uuid references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind public.document_kind not null,
  label text,                              -- Solo obligatorio si kind = 'otro'
  url text not null,                       -- Validado como URL en la aplicación
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_one_owner check (
    (client_id is not null and project_id is null) or
    (client_id is null and project_id is not null)
  ),
  constraint documents_kind_scope check (
    (client_id is not null and kind in ('informe_cliente', 'otro')) or
    (project_id is not null and kind in ('informe_proyecto', 'contrato', 'repositorio', 'pys', 'guia_uso', 'otro'))
  )
);

create unique index documents_client_kind_uniq
  on public.documents (client_id, kind)
  where client_id is not null and kind <> 'otro';

create unique index documents_project_kind_uniq
  on public.documents (project_id, kind)
  where project_id is not null and kind <> 'otro';

create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
