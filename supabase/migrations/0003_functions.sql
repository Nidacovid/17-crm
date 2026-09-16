-- Fase 1 · 0003: funciones (sección 4.4)
-- Los cuerpos en plpgsql se resuelven en ejecución, por lo que pueden
-- referenciar tablas y secuencias que se crean en migraciones posteriores.

-- 1) updated_at automático (aplicar a todas las tablas con esa columna)
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- 2) Código legible del proyecto: PRJ-0001
create or replace function set_project_code() returns trigger
language plpgsql as $$
begin
  if new.code is null then
    new.code := 'PRJ-' || lpad(nextval('project_code_seq')::text, 4, '0');
  end if;
  return new;
end $$;

-- 3) Crear las 9 tareas al crear un proyecto (D-21)
create or replace function seed_project_tasks() returns trigger
language plpgsql as $$
begin
  insert into tasks (owner_id, project_id, phase, title, status, position)
  values
    (new.owner_id, new.id, 'inicio_cliente',   'Inicio cliente',   'todo', 1000),
    (new.owner_id, new.id, 'planificacion',    'Planificación',    'todo', 2000),
    (new.owner_id, new.id, 'fases',            'Fases',            'todo', 3000),
    (new.owner_id, new.id, 'bugs',             'Bugs',             'todo', 4000),
    (new.owner_id, new.id, 'probando',         'Probando',         'todo', 5000),
    (new.owner_id, new.id, 'ajustes',          'Ajustes',          'todo', 6000),
    (new.owner_id, new.id, 'revision_cliente', 'Revisión cliente', 'todo', 7000),
    (new.owner_id, new.id, 'retoques',         'Retoques',         'todo', 8000),
    (new.owner_id, new.id, 'auditorias',       'Auditorías',       'todo', 9000);
  return new;
end $$;

-- 4) Fechas automáticas de la tarea al cambiar de estado (D-25)
create or replace function set_task_timestamps() returns trigger
language plpgsql as $$
begin
  if new.status = 'doing' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'done' and new.completed_at is null then
    new.completed_at := now();
    if new.started_at is null then new.started_at := now(); end if;
  end if;
  if new.status <> 'done' then
    new.completed_at := null;   -- reabrir una tarea limpia la fecha de cierre
  end if;
  return new;
end $$;

-- 5) Fechas automáticas del proyecto al cambiar de estado
create or replace function set_project_timestamps() returns trigger
language plpgsql as $$
begin
  if new.status = 'en_desarrollo' and new.started_at is null then
    new.started_at := current_date;
  end if;
  if new.status = 'terminado' and new.delivered_at is null then
    new.delivered_at := current_date;
  end if;
  if new.status = 'cancelado' and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;
  if new.status <> 'cancelado' then new.cancelled_at := null; end if;
  return new;
end $$;

-- 6) last_contact_at del cliente = fecha de su nota más reciente
create or replace function refresh_client_last_contact() returns trigger
language plpgsql as $$
declare cid uuid;
begin
  cid := coalesce(new.client_id, old.client_id);
  update clients c
     set last_contact_at = (select max(note_date) from client_notes n where n.client_id = cid)
   where c.id = cid;
  return null;
end $$;

-- 7) Crear app_settings al registrarse el usuario
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.app_settings (owner_id) values (new.id)
  on conflict do nothing;
  return new;
end $$;
