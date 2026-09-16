-- Fase 1 · 0002: tipos enumerados (sección 4.2)
create type client_status as enum ('potencial', 'en_proceso', 'terminado', 'nada');
create type project_status as enum ('a_empezar', 'en_desarrollo', 'terminado', 'cancelado');
create type task_status as enum ('todo', 'doing', 'done');

-- Las 9 fases, en el orden canónico del Excel original
create type task_phase as enum (
  'inicio_cliente',
  'planificacion',
  'fases',
  'bugs',
  'probando',
  'ajustes',
  'revision_cliente',
  'retoques',
  'auditorias'
);

create type document_kind as enum (
  'informe_cliente',    -- solo clientes
  'informe_proyecto',   -- solo proyectos
  'contrato',
  'repositorio',
  'pys',
  'guia_uso',
  'otro'
);

create type payment_mode as enum ('unico', 'plazos');

create type project_expense_category as enum (
  'suscripcion', 'licencia', 'dominio', 'hosting',
  'subcontrata', 'hardware', 'software', 'otros'
);

create type business_expense_category as enum (
  'ia_tokens', 'software', 'hosting', 'dominio', 'hardware',
  'gestoria', 'impuestos', 'formacion', 'otros'
);

create type expense_recurrence as enum ('unico', 'mensual', 'trimestral', 'anual');

create type sync_state as enum ('pendiente', 'sincronizado', 'error', 'no_aplica');
