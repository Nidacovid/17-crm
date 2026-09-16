-- Fase 1 · 0013: vistas (sección 4.5)
-- Todas con WITH (security_invoker = true): sin esto una vista se ejecuta con
-- los permisos de su creador y se salta la RLS (regla 2.1.3).
-- Nota: la sección 4.5 define 9 vistas (la tarea dice 10, pero el catálogo
-- de la sección 4.5 contiene exactamente estas 9; no se inventa ninguna más).

-- v_payments: pagos con estado derivado (pagado/pendiente/vencido) y días de retraso.
-- Incluye proyecto y cliente porque la consumen Home, Métricas y la ficha de proyecto.
create or replace view v_payments with (security_invoker = true) as
select
  pay.id,
  pay.owner_id,
  pay.project_id,
  pr.code            as project_code,
  pr.name            as project_name,
  c.id               as client_id,
  c.business_name    as client_business_name,
  pay.seq,
  pay.label,
  pay.amount,
  pay.due_date,
  pay.paid_at,
  pay.method,
  pay.google_event_id,
  pay.sync_state,
  pay.sync_error,
  pay.synced_at,
  case
    when pay.paid_at is not null then 'pagado'
    when pay.due_date < current_date then 'vencido'
    else 'pendiente'
  end as status,
  case
    when pay.paid_at is null and pay.due_date < current_date
      then current_date - pay.due_date
    else 0
  end as days_overdue
from public.payments pay
join public.projects pr on pr.id = pay.project_id
join public.clients c on c.id = pr.client_id;

-- v_project_totals: definición de referencia de la sección 4.5 (verbatim)
create or replace view v_project_totals with (security_invoker = true) as
select
  p.id                             as project_id,
  p.owner_id,
  p.code, p.name, p.status, p.level, p.client_id,
  p.price_net,
  round(p.price_net * (1 + p.vat_rate/100), 2) as price_gross,
  p.estimated_hours,
  coalesce(t.minutes_total, 0)                          as minutes_total,
  round(coalesce(t.minutes_total, 0) / 60.0, 2)         as hours_total,
  coalesce(t.cost_tokens, 0)                            as cost_tokens,
  coalesce(e.cost_extra, 0)                             as cost_extra,
  coalesce(t.cost_tokens, 0) + coalesce(e.cost_extra, 0) as cost_total,
  p.price_net - (coalesce(t.cost_tokens,0) + coalesce(e.cost_extra,0)) as margin_eur,
  case when p.price_net > 0 then
    round(100 * (p.price_net - (coalesce(t.cost_tokens,0) + coalesce(e.cost_extra,0))) / p.price_net, 2)
  end as margin_pct,
  case when coalesce(t.minutes_total,0) > 0 then
    round((p.price_net - (coalesce(t.cost_tokens,0) + coalesce(e.cost_extra,0)))
          / (t.minutes_total / 60.0), 2)
  end as eur_per_hour,
  case when p.estimated_hours > 0 and coalesce(t.minutes_total,0) > 0 then
    round(100 * ((t.minutes_total/60.0) - p.estimated_hours) / p.estimated_hours, 2)
  end as hours_deviation_pct,
  coalesce(pay.collected, 0) as collected,
  coalesce(pay.pending, 0)   as pending,
  coalesce(pay.overdue, 0)   as overdue,
  coalesce(t.done_count, 0)  as tasks_done,
  coalesce(t.total_count, 0) as tasks_total
from projects p
left join (
  select project_id,
         sum(minutes)  as minutes_total,
         sum(cost_eur) as cost_tokens,
         count(*) filter (where status = 'done') as done_count,
         count(*) as total_count
  from tasks group by project_id
) t on t.project_id = p.id
left join (
  select project_id, sum(amount) as cost_extra
  from project_expenses group by project_id
) e on e.project_id = p.id
left join (
  select project_id,
         sum(amount) filter (where paid_at is not null) as collected,
         sum(amount) filter (where paid_at is null)     as pending,
         sum(amount) filter (where paid_at is null and due_date < current_date) as overdue
  from payments group by project_id
) pay on pay.project_id = p.id;

-- v_db_general: el Excel original pivotado (D-07). Definición de la sección 4.5 (verbatim)
create or replace view v_db_general with (security_invoker = true) as
select
  p.owner_id,
  p.code                as "PROYECTO",
  p.name                as "NOMBRE DEL PROYECTO",
  c.business_name       as "CLIENTE",
  c.phone               as "TELEFONO CLIENTE",
  p.level               as "NIVEL",
  p.price_net           as "PRECIO",
  round(sum(t.minutes) filter (where t.phase='inicio_cliente')  /60.0, 2) as "T / INICIAL CON CLIENTE",
  round(sum(t.minutes) filter (where t.phase='planificacion')   /60.0, 2) as "T / PLANIFICACION",
  round(sum(t.minutes) filter (where t.phase='fases')           /60.0, 2) as "T / FASES",
  round(sum(t.minutes) filter (where t.phase='bugs')            /60.0, 2) as "T / BUGS",
  round(sum(t.minutes) filter (where t.phase='probando')        /60.0, 2) as "T / PROBANDO",
  round(sum(t.minutes) filter (where t.phase='ajustes')         /60.0, 2) as "T / AJUSTES",
  round(sum(t.minutes) filter (where t.phase='revision_cliente')/60.0, 2) as "T / REVISION CLIENTE",
  round(sum(t.minutes) filter (where t.phase='retoques')        /60.0, 2) as "T / RETOQUES",
  round(sum(t.minutes) filter (where t.phase='auditorias')      /60.0, 2) as "T / AUDITORIAS",
  round(sum(t.minutes)/60.0, 2)                                           as "SUM TIEMPO",
  sum(t.cost_eur) filter (where t.phase='planificacion') as "C / PLANIFICACION",
  sum(t.cost_eur) filter (where t.phase='fases')         as "C / FASES",
  sum(t.cost_eur) filter (where t.phase='bugs')          as "C / BUGS",
  sum(t.cost_eur) filter (where t.phase='ajustes')       as "C / AJUSTES",
  sum(t.cost_eur) filter (where t.phase='auditorias')    as "C / AUDITORIAS",
  sum(t.cost_eur) filter (where t.phase='retoques')      as "C / RETOQUES",
  sum(t.cost_eur)                                        as "SUM COSTES"
from projects p
join clients c on c.id = p.client_id
left join tasks t on t.project_id = p.id
group by p.id, c.id;

-- v_client_totals: por cliente: nº proyectos, facturado total, cobrado,
-- pendiente, horas y margen (LTV). Construida sobre v_project_totals.
create or replace view v_client_totals with (security_invoker = true) as
select
  c.id as client_id,
  c.owner_id,
  c.business_name,
  c.status,
  count(p.id) as projects_count,
  coalesce(sum(p.price_net), 0) as billed_total,
  coalesce(sum(pt.collected), 0) as collected,
  coalesce(sum(pt.pending), 0) as pending,
  round(coalesce(sum(pt.minutes_total), 0) / 60.0, 2) as hours_total,
  coalesce(sum(pt.margin_eur), 0) as margin_eur
from clients c
left join projects p on p.client_id = c.id
left join v_project_totals pt on pt.project_id = p.id
group by c.id;

-- v_business_expense_months: expansión de recurrencias (sección 4.5, verbatim)
create or replace view v_business_expense_months with (security_invoker = true) as
select
  b.owner_id, b.id as expense_id, b.concept, b.category, b.amount,
  date_trunc('month', m)::date as month
from business_expenses b
cross join lateral generate_series(
  date_trunc('month', b.starts_on),
  date_trunc('month', coalesce(b.ends_on, greatest(current_date, b.starts_on))),
  case b.recurrence
    when 'mensual'    then interval '1 month'
    when 'trimestral' then interval '3 months'
    when 'anual'      then interval '12 months'
    else interval '1200 months'   -- 'unico': solo genera el primer mes
  end
) as m;

-- v_monthly_cash: por mes: cobrado, pendiente vencido, coste de tokens,
-- gasto de proyectos, gasto general y beneficio neto (7.1).
-- El beneficio neto sigue la fórmula de la cabecera de Métricas:
-- cobrado − coste tokens (tareas cerradas en el mes) − gastos extra de
-- proyecto del mes − gastos generales imputados al mes.
create or replace view v_monthly_cash with (security_invoker = true) as
with bounds as (
  select coalesce(
    least(
      coalesce((select min(paid_at) from payments), current_date),
      coalesce((select min(due_date) from payments), current_date),
      coalesce((select min(incurred_on) from project_expenses), current_date),
      coalesce((select min(month) from v_business_expense_months), current_date)
    ),
    current_date
  )::date as start_month
),
months as (
  select generate_series(
    date_trunc('month', (select start_month from bounds)),
    date_trunc('month', current_date),
    interval '1 month'
  )::date as month
),
collected as (
  select date_trunc('month', paid_at)::date as month, sum(amount) as collected
  from payments where paid_at is not null group by 1
),
pending_overdue as (
  select date_trunc('month', due_date)::date as month, sum(amount) as pending_overdue
  from payments where paid_at is null and due_date < current_date group by 1
),
tokens as (
  select date_trunc('month', completed_at)::date as month, sum(cost_eur) as cost_tokens
  from tasks where completed_at is not null and cost_eur is not null group by 1
),
pexpenses as (
  select date_trunc('month', incurred_on)::date as month, sum(amount) as project_expenses
  from project_expenses group by 1
),
bexpenses as (
  select month, sum(amount) as business_expenses
  from v_business_expense_months group by 1
)
select
  m.month,
  coalesce(c.collected, 0)       as collected,
  coalesce(po.pending_overdue, 0) as pending_overdue,
  coalesce(t.cost_tokens, 0)      as cost_tokens,
  coalesce(pe.project_expenses, 0) as project_expenses,
  coalesce(be.business_expenses, 0) as business_expenses,
  coalesce(c.collected, 0)
    - coalesce(t.cost_tokens, 0)
    - coalesce(pe.project_expenses, 0)
    - coalesce(be.business_expenses, 0) as net_profit
from months m
left join collected c on c.month = m.month
left join pending_overdue po on po.month = m.month
left join tokens t on t.month = m.month
left join pexpenses pe on pe.month = m.month
left join bexpenses be on be.month = m.month;

-- v_receivables_aging: pagos pendientes agrupados en 0–30 / 31–60 / +60 días de retraso
create or replace view v_receivables_aging with (security_invoker = true) as
select
  o.owner_id,
  o.bucket,
  count(*) as payments_count,
  sum(o.amount) as amount_total
from (
  select
    p.owner_id,
    p.amount,
    case
      when current_date - p.due_date <= 30 then '0-30'
      when current_date - p.due_date <= 60 then '31-60'
      else '+60'
    end as bucket
  from payments p
  where p.paid_at is null and p.due_date < current_date
) o
group by o.owner_id, o.bucket;

-- v_phase_stats: por fase y nivel: media y mediana de minutos y de coste,
-- nº de observaciones. Alimenta M8, M12 y M23.
create or replace view v_phase_stats with (security_invoker = true) as
select
  t.owner_id,
  t.phase,
  p.level,
  count(t.minutes) as minutes_n,
  round(avg(t.minutes)) as minutes_avg,
  percentile_cont(0.5) within group (order by t.minutes)
    filter (where t.minutes is not null) as minutes_median,
  count(t.cost_eur) as cost_n,
  round(avg(t.cost_eur), 2) as cost_avg,
  percentile_cont(0.5) within group (order by t.cost_eur)
    filter (where t.cost_eur is not null) as cost_median
from tasks t
join projects p on p.id = t.project_id
group by t.owner_id, t.phase, p.level;

-- v_project_funnel: recuento de clientes por estado y tasas de conversión
-- del embudo potencial → en_proceso → terminado (M15).
create or replace view v_project_funnel with (security_invoker = true) as
select
  c.owner_id,
  count(*) filter (where c.status = 'potencial')  as potentials,
  count(*) filter (where c.status = 'en_proceso') as in_process,
  count(*) filter (where c.status = 'terminado')  as finished,
  count(*) filter (where c.status = 'nada')       as none_status,
  count(*) as total,
  case when count(*) > 0 then
    round(100.0 * count(*) filter (where c.status in ('en_proceso', 'terminado')) / count(*), 2)
  end as conversion_in_process_pct,
  case when count(*) > 0 then
    round(100.0 * count(*) filter (where c.status = 'terminado') / count(*), 2)
  end as conversion_finished_pct
from clients c
group by c.owner_id;
