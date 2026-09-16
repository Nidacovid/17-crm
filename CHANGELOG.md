# Changelog

## Fase 8 — Home (2026-09-16)

Pantalla de entrada con los cuatro bloques exigidos (8.1): `app/(app)/page.tsx` monta la rejilla
2 × 2 (fila superior `1fr 1fr`, inferior `1.4fr 1fr`; en móvil una sola columna en el mismo orden).
Las cuatro tarjetas viven en `components/home/`: `RevenueCard` (8.2, cifra grande del mes cobrado,
variación frente al mes anterior coloreada y pendiente del mes, con toda la tarjeta enlazando a
`/metricas`), `ActiveProjectsCard` (8.3, proyectos `en_desarrollo` completados con `a_empezar` hasta
5 si hay menos de tres, cada fila con negocio, barra de progreso y `N / 9`, enlazando a
`/proyectos/[id]` —panel lateral—), `CalendarCard` (8.4, rejilla mensual propia lunes-primero,
navegación de mes, día actual con borde de acento, vencimientos de cobro con punto acento/negativo,
`+N` si hay más de dos y solo lectura) y `TodayCard` (8.5, D-14, con las secciones Cobros, En curso
y Eventos de hoy). `lib/queries/home.ts` contiene una consulta por bloque (`getHomeRevenue`,
`getActiveProjects`, `getHomeCalendar`, `getTodayPanel`), lanzadas en paralelo desde el Server
Component y resueltas cada una dentro de su propio `Suspense` con `Skeleton` (8.6). `npm run build`,
`npm run lint` y `tsc --noEmit` pasan sin errores.

### Decisiones de implementación

- **Promesas en paralelo + Suspense por tarjeta**: las cuatro consultas se lanzan juntas en
  `page.tsx`; las tarjetas de solo lectura (`RevenueCard`, `ActiveProjectsCard`) son Server
  Components async que hacen `await`, y las interactivas (`CalendarCard`, `TodayCard`) reciben la
  misma promesa y la resuelven con `use()` de React 19 dentro de su `Suspense`. Así se cumplen a la
  vez el paralelismo y el aislamiento de 8.6 sin duplicar consultas.
- **`v_payments` es la única fuente de Home** (8.2/8.4/8.5): ya trae `client_business_name`,
  `project_name`, `status` derivado y `days_overdue`, con columnas explícitas (regla 2.2.12). La
  facturación del mes y del mes anterior se calculan en JS sobre `amount`/`paid_at` (el "cobro real"
  es `paid_at`, no `due_date`).
- **Fechas en `Europe/Madrid`** con `formatInTimeZone` tanto en servidor como en cliente, para que
  "hoy", el mes en curso y los vencimientos no se desplacen por UTC.
- **`CalendarCard` devuelve todos los vencimientos pendientes y filtra por mes en cliente**, de modo
  que las flechas de navegación funcionan sin lanzar una consulta por mes. Los pagos ya cobrados no
  se muestran como vencimientos. El mensaje *"Conecta tu Google Calendar en Ajustes para ver tus
  eventos."* aparece centrado sobre la rejilla cuando el mes no tiene eventos; en cuanto Google
  esté conectado (Fase 10) se sustituirá por los eventos reales.
- **`TodayCard` reutiliza `markPaid`** (Fase 6): al marcar un cobro se oculta la fila y se llama a
  `router.refresh()`, que re-ejecuta el Server Component y recalcula la facturación del mes de
  `RevenueCard`. La sección "Eventos de hoy" queda oculta mientras no haya conexión con Google.
- **`EmptyState` reutilizado** con los textos literales de 8.3/8.5; sin emojis, sin degradados y
  cifras con `tabular-nums`, conforme a las reglas transversales.

### Verificación

- `npm run build`, `npm run lint` y `npx tsc --noEmit` sin errores ni advertencias.
- Render real de `/` (servidor de desarrollo, con el middleware relajado temporalmente y revertido
  después): HTTP 200 con los cuatro bloques, el estado vacío de proyectos, el mensaje de Google y
  "Nada pendiente para hoy." sin errores de suspensión.
- Comprobación de la matemática de facturación contra la base real: la suma del mes calculada en JS
  sobre `v_payments` coincide con la consulta filtrada por rango de fechas (dato actual: 0 € en el
  mes y 100 € pendientes del mes). Las consultas de las cuatro tarjetas se ejecutan contra la base
  real sin error de columnas.

## Fase 7 — Gastos (2026-09-15)

Gastos extra por proyecto (7.1): `ProjectExpensesBlock` sustituye el marcador de la Fase 4 con el
encabezado "Gastos extra" y **el total destacado a la derecha** (lista de filas por debajo, D-05),
lista compacta `concepto · categoría · importe · fecha` con menú de tres puntos para editar/borrar,
alta en línea de filas mediante "+ Añadir gasto" en modo edición, estado vacío *"Sin gastos extra
registrados."* y el desglose en `--text-muted` `Tokens de IA · Gastos extra · Total` leído de
`v_project_totals`. Gastos generales del negocio (7.2): `/gastos` con `PageHeader` "Gastos del
negocio" y botón "Añadir gasto", tres `KpiCard` (fijo mensual normalizado, mes en curso, últimos 12
meses), tabla `concepto · categoría · importe · recurrencia · desde · hasta · estado` con
`Activo`/`Finalizado`, filtro por categoría y conmutador "Mostrar finalizados", y `ExpenseForm` para
alta/edición. Siete Server Actions en `lib/actions/expenses.ts` y query `lib/queries/expenses.ts`.
`npm run build`, `npm run lint` y `tsc --noEmit` pasan sin errores.

### Decisiones de implementación

- **"Finalizar gasto" no borra**: rellena `ends_on` con la fecha de hoy en Europe/Madrid y el propio
  diálogo explica que los meses anteriores siguen contando en el P&L histórico; el borrado real
  (`deleteBusinessExpense`) queda como acción destructiva separada para errores de tecleo.
- **Los KPIs de mes y de últimos 12 meses leen `v_business_expense_months`** (gasto efectivo del
  periodo, ya expandido), mientras que "Gasto fijo mensual" normaliza en JS los recurrentes activos
  (mensual = importe; trimestral = /3; anual = /12), que es lo que exige literalmente 7.2.
- **`KpiCard` se crea ya en `components/metrics/`** (nombre y ubicación de la sección 6 y de 7.6),
  con `label`, `value`, `delta` y `footnote`, para que la Fase 9 lo reutilice sin duplicarlo.
- **Fichero extra `BusinessExpenseFilters.tsx`** (no listado en la sección 6): el conmutador
  "Mostrar finalizados" necesita estado de cliente para reflejarse en la URL; `FilterGroup` solo
  puede fijar valores, no conmutar, así que se añade junto al filtro de categoría.
- **`ExpenseForm` es un diálogo autocontenido** (con `trigger` y modo controlado `open`/`onOpenChange`)
  para servir tanto al botón de la cabecera como a la edición desde la tabla sin crear un fichero de
  diálogo aparte; `AddBusinessExpenseButton` vive en el mismo fichero.
- **`businessExpenseSchema` normaliza vacíos con `z.preprocess`** para que "sin fecha de fin" y
  "sin notas" del formulario no fallen la validación.
- **Verificación contra la base real** (con limpieza total): una suscripción mensual de 20 € creada
  hace 3 meses aparece en 4 filas de `v_business_expense_months`; finalizarla hoy la mantiene en los
  4 meses pasados/incluido el actual y la excluye de los futuros; un gasto anual de 240 € da
  `fixedMonthly = 20` (comprobado ejecutando la función real); y añadir un gasto extra de 30 € a un
  proyecto existente sube `cost_total` en 30, baja el margen en 30 y el desglose cuadra con
  `v_project_totals`.

## Fase 6 — Pagos (2026-09-15)

Plan de pagos por proyecto (6.1): la configuración (Precio, **De una vez / A plazos**, nº de
plazos y entrada) vive en el formulario de la ficha y `updateProject` ya la persiste;
`PaymentPlanEditor` (solo en modo edición) genera la propuesta al configurar o cambiar el plan —
una fila total a 30 días en "De una vez"; entrada hoy + plazos mensuales en "A plazos", con la
última fila ajustando los céntimos de redondeo para que la suma cuadre exactamente con el precio —
con filas editables (concepto, importe, fecha), alta/borrado a mano, botón "Regenerar plan",
cobros históricos bloqueados y validación permanente de cuadre `Σ importes vs precio` con la
diferencia en `--warning` sin bloquear el guardado. `PaymentsTable` (modo lectura) con las
columnas Concepto · Importe · Fecha · Estado (`StatusBadge` Pagado/Pendiente/Vencido derivado de
`v_payments`) · Cobrado (`MarkPaidCheckbox` con actualización optimista y opción de cobrar en
otra fecha desde el menú de la fila), pie **Cobrado X de Y / Pendiente Z** y estado vacío. Pie
de guardado: el botón Guardar de la ficha persiste proyecto y plan (`generatePaymentPlan`:
borra las filas no pagadas y crea las nuevas; nunca toca una fila ya cobrada). 6.2: sin Google;
todas las mutaciones dejan `sync_state = 'pendiente'`. Cinco Server Actions en
`lib/actions/payments.ts`, query `lib/queries/payments.ts`, estados de pago en
`lib/constants/statuses.ts` y `lib/queries/projects.ts` ampliado. `npm run build`, `npm run lint`
y `tsc --noEmit` pasan; generación del plan y comportamientos de base verificados (triggers,
`v_payments`, borrado selectivo de no cobrados) contra Supabase con limpieza total.

### Decisiones de implementación

- **El plan se guarda junto con la ficha, no con un botón propio.** El editor del plan vive en
  el bloque Pagos durante la edición y su borrador se persiste con el Guardar de la ficha
  (`updateProject` + `generatePaymentPlan` cuando el borrador difiere del estado guardado), para
  que configuración y filas no puedan quedarse desincronizadas. Si `generatePaymentPlan` falla,
  la ficha permanece en edición y se conserva el borrador.
- **Redondeo: la última fila absorbe los céntimos** ("333,33 + 333,33 + 333,34"), tal como dice
  el texto de la fase; el criterio de aceptación lo admite como "o equivalente" y la suma cuadra
  exactamente (verificado con el algoritmo ejecutado sobre 1.000 €/3 plazos). Cálculo en céntimos
  enteros para evitar errores de coma flotante.
- **`generatePaymentPlan` es "transaccional en alcance":** el borrado filtra `paid_at IS NULL`,
  así que un fallo entre el borrado y la inserción nunca puede perder cobros; las seq nuevas se
  asignan saltando las ocupadas por filas cobradas (índice único `project_id, seq`). PostgREST
  no ofrece transacciones reales sin una RPC, que requeriría una migración fuera del alcance de
  la fase.
- **Pago único etiquetado "Pago único"** con fecha a 30 días; "Entrada" con fecha hoy; plazos
  "Plazo N de M" mensuales desde hoy.
- **Constantes de columnas y normalización duplicadas en `PaymentsTable`** (como ya hacía el
  kanban con `TASK_COLUMNS`): `lib/queries/*` importa `next/headers` y no puede entrar en el
  bundle de cliente.
- **Etiquetas de `PAYMENT_MODE` actualizadas a "De una vez / A plazos"** en la única fuente de
  verdad (`lib/constants/categories.ts`) para respetar el texto literal de la fase; no había
  ningún otro uso.
- **`markPaid` fija `paid_at` con la fecha de hoy en Europe/Madrid** (server-side con
  `formatInTimeZone`), no la fecha UTC del servidor.

## Fase 5 — Tareas (Kanban) (2026-09-15)

Kanban funcional en `/proyectos/[id]/tareas` (siempre a página completa): cabecera con migas de
pan `Proyectos / {proyecto} / Tareas`, botón de volver, las tres cifras de `v_project_totals`
(Horas totales · Coste total · finalizadas de 9) y botón secundario "Añadir tarea"; tres
columnas de anchura igual **To do / En curso / Finished** con recuento y estado vacío explícito;
tarjetas con título, marca "Personalizada", tiempo y coste al finalizar y menú de tres puntos
(Mover a… · Editar tiempo y coste · Editar tarea · Eliminar tarea); `TaskCompleteDialog` que se
abre al mover a Finished (horas + minutos combinados, coste solo si la fase lo admite, aviso de
"sin tiempo" y guardado con campos vacíos); `TaskCustomDialog` para crear (título + columna) y
editar título. Movimiento optimista con TanStack Query y revalidación con `router.refresh()`.
Añadidos las 6 Server Actions de `lib/actions/tasks.ts`, la query `lib/queries/tasks.ts` y los 6
componentes de `components/tasks/`. `npm run build`, `npm run lint` y `tsc --noEmit` pasan sin
errores.

### Corrección — finalizar tareas de fases sin coste (2026-09-15)

Al finalizar una tarea de **Inicio cliente, Probando o Revisión cliente** aparecía
*"Esta fase no registra coste de IA."* aunque no se hubiera introducido ningún coste. Causa: el
diálogo validaba con `taskCompletionSchema` y la Server Action **revalidaba** el resultado ya
transformado; el transform deja `cost_eur: null` y, al reparsearlo, `z.coerce.number()` convertía
`null` en `0`, que la comprobación D-04 interpretaba como coste real (y además habría guardado
`cost_eur = 0` en las fases con coste). Se corrigió **una sola vez en el esquema** añadiendo un
`z.preprocess` que normaliza `null`/`""`/`undefined` a ausente antes del `coerce`, de modo que el
parseo es idempotente para `hours`, `minutes` y `cost_eur`. Así `minutes` vacío sigue siendo
`null` (no `0`) y el coste vacío no dispara la barrera D-04. Probado en Node con entradas crudas y
con el payload ya transformado (reparseo); `tsc`, `lint` y `build` pasan.

### Corrección — el panel del proyecto no se cerraba al entrar en Tareas (2026-09-15)

Al pulsar "Tareas" desde la ficha abierta como panel lateral (D-18), el kanban se cargaba en el
área principal pero el panel del proyecto seguía superpuesto, y el botón X (`router.back()`)
volvía a `/proyectos/[id]`, reabriendo el panel: no había forma de cerrarlo. Causa: en navegación
de cliente, Next.js mantiene el subpage activo de un slot cuando la nueva URL no coincide con
ninguna de sus rutas; `@panel/default.tsx` solo se usa en carga dura/recarga, no en soft
navigation. Solución (la que documenta Next para modales con Parallel + Intercepting Routes):
añadido `app/(app)/@panel/[...catchAll]/page.tsx` que devuelve `null`, de modo que cualquier
navegación suave que no case con `(.)proyectos/[id]` ni `(.)contactos/[id]` renderiza el panel
vacío y lo cierra (abrir la ficha desde la lista sigue funcionando: la ruta interceptada
específica tiene prioridad sobre el catch-all). `tsc`, `lint` y `build` pasan; el comportamiento
interactivo queda pendiente de confirmación visual del usuario.

### Decisiones de implementación

- **Mover a Finished no llama a `moveTask`: abre el diálogo y guarda con `completeTask`.** Así la
  tarea solo cambia de estado al confirmar (con tiempo/coste o vacía), evitando que un Cancelar
  deje una tarjeta en Finished sin pasar por el diálogo. `moveTask` se reserva a todo/doing.
- **El clic en la tarjeta abre el diálogo en cualquier estado.** 5.3 dice que el clic abre "el
  mismo diálogo"; en tareas no finalizadas ese mismo diálogo actúa como finalización rápida
  (mismo flujo que el menú "Mover a → Finished"), y en las finalizadas corrige tiempo y coste.
- **Las cifras del encabezado se leen de `v_project_totals` en el servidor y se refrescan con
  `router.refresh()`** tras cada mutación, para que coincidan literalmente con la vista y no con
  un cálculo en cliente. La lectura del tablero usa el cliente de navegador dentro de TanStack
  Query (excepción de la regla 2.4.22) con RLS activo.
- **`TASK_STATUS_KEYS` da el orden de columnas y del submenú Mover a**, sin duplicar etiquetas.
- **`phaseAllowsCost(phase)` centraliza la regla D-04** (6 fases con coste; `phase = null` de las
  personalizadas también) y la usan tarjeta, diálogo y servidor. `completeTask` y
  `updateTaskEffort` rechazan `cost_eur` no nulo en fase sin coste (segunda barrera), y la
  restricción `tasks_cost_allowed` es la tercera.
- **`PageHeader` se amplía con `breadcrumbs` y `backHref` opcionales** (no existía migas de pan);
  el resto de pantallas siguen sin usarlos.
- **`TASK_STATUS` ya existía con las etiquetas exactas** ("To do", "En curso", "Finished"), así
  que el tablero las toma de `lib/constants/statuses.ts` (regla 2.4.24).
- **Verificación contra la base real** con un bloque DO temporal: 9 tareas en To do en orden
  canónico, rechazo de coste en Probando, `started_at`/`completed_at` por trigger, vuelta a To do
  que limpia `completed_at` conservando `minutes = 150`, tarea personalizada con coste creada y
  borrada, y `v_project_totals` (0 done / 150 min / 5,50 €). Base devuelta a su estado previo (el
  cliente real `GM PUBLICIDAD` intacto) y `project_code_seq` restaurada a su valor anterior.
  `taskCompletionSchema` (2 h 30 min → 150) y `phaseAllowsCost` probados en Node con los ficheros
  compilados. El comportamiento visual/interactivo del tablero y el rollback de red (onError)
  quedan sobre revisión estática, pendientes de confirmación visual del usuario.

## Fase 4 — Proyectos (2026-09-15)

Gestión completa de proyectos reutilizando los patrones de la Fase 3: lista `/proyectos` con
búsqueda por proyecto y negocio, filtro de estado con "Cancelados" desactivado por defecto
(`?q=&estado=`, cancelados fuera si no hay filtro), columnas Proyecto — Negocio — Estado más
Precio · Horas · Pendiente de cobro y barra de progreso `N / 9`; creación con
`ProjectCreateDialog` (cliente + nombre como mínimo, selección de cliente con búsqueda y
"Crear cliente nuevo", y botones "Ver proyecto" / "Ir a Tareas" tras crear); ficha
`ProjectDetail` (título `"Proyecto — Negocio"`, Resumen desde `v_project_totals`, Datos con
ver/editar, 5 documentos fijos + "Otro", bloque Tareas pulsable y marcadores de Pagos y Gastos
extra) compartida por la página completa y el panel interceptado `@panel/(.)proyectos/[id]`;
`ArchiveProjectDialog` con archivado (D-10) y borrado definitivo que exige el nombre exacto.
Añadidas las Server Actions `projects.ts` y `documents.ts`, la query `lib/queries/projects.ts`
y los 8 componentes de `components/projects/`. `npm run build`, `npm run lint` y `tsc` pasan
sin errores.

### Decisiones de implementación

- **Búsqueda por proyecto y negocio resuelta en el servidor con mezcla en JS.** PostgREST de
  este proyecto rechaza `or=(name.ilike…,clients.business_name.ilike…)` (PGRST100), así que la
  query trae las columnas explícitas y las filas se filtran/dividen en memoria, igual que los
  recuentos de la Fase 3; el volumen es mono-usuario y no hay `select('*')`.
- **"Todos" excluye los cancelados.** D-10 pide que los archivados no aparezcan por defecto,
  de modo que sin filtro (o con "Todos") solo se listan a_empezar/en_desarrollo/terminado y la
  pestaña "Cancelados" los hace accesibles. El recuento de "Todos" también es no-cancelado.
- **`code` se omite en el INSERT y se fuerza el tipo del payload.** El trigger `set_project_code`
  lo genera, pero el tipo generado por Supabase marca `code` obligatorio por no tener DEFAULT;
  se documenta el cast para no duplicar la generación del código en el cliente.
- **`updateProject` no toca `payment_mode`, `installments` ni `down_payment`.** No forman parte
  de los campos de Datos de esta fase (llegan en Pagos); incluirlos con los valores por defecto
  del esquema Zod los habría sobrescrito al guardar.
- **El nombre del proyecto sí es editable en Datos** (no listado explícitamente en 4.3.3), como
  el negocio lo es en la ficha de contacto: sin él no habría forma de corregir un nombre. En
  modo lectura el nombre sigue siendo el título, no una fila más de `FieldList`.
- **`ConfirmDialog` se amplía con `children`, `footer`, `busyLabel` y `confirmDisabled`.**
  `ArchiveProjectDialog` necesita el enlace discreto "Eliminar definitivamente" al pie y un
  input de confirmación por nombre; la alternativa era duplicar el diálogo destructivo y romper
  la regla 2.3.18.
- **Los documentos son su propia `EditableSection`.** Cada sección puede tener su Editar (D-19);
  así los 5 tipos fijos y los "Otro" (con alta/baja) se guardan de forma independiente mediante
  `upsertProjectDocument`/`deleteDocument`, que hacen upsert a mano por el índice único parcial
  de `documents`. Vaciar la URL de un tipo fijo elimina el documento.
- **`ClientCreateDialog` gana `onCreated` y `trigger`** para reutilizarse como "Crear cliente
  nuevo" dentro del selector de cliente del proyecto, sin duplicar el formulario de contacto.
- **Verificación con datos temporales contra la base real**: bloque DO que crea un proyecto con
  solo cliente y nombre, comprueba el código `PRJ-XXXX`, las 9 tareas con sus posiciones, el
  rechazo de coste en fase sin coste, el `v_project_totals` (tasks_done/minutos/coste), el
  archivado conservando tareas, horas y costes, y el borrado en cascada; después base devuelta a
  vacío y `project_code_seq` restaurada a estado virgen (`setval(..., 1, false)`). El
  comportamiento interactivo del panel sigue el patrón exacto de 5.3 y queda pendiente de
  confirmación visual del usuario.

## Fase 3 — Contactos (2026-09-15)

Gestión completa de clientes: lista `/contactos` con búsqueda (negocio, teléfono y tipo de
negocio, `.or` de PostgREST exacto del plan, retardo de 250 ms), filtro de estado con
recuentos, ambos reflejados en la URL (`?q=&estado=`), tabla ordenable (negocio/estado/nº de
proyectos) que se convierte en tarjetas en móvil, ficha `/contactos/[id]` con patrón
ver/editar (D-19) y panel lateral interceptado `@panel/(.)contactos/[id]` (D-18), formulario
`ClientForm` (crear en `Dialog`, editar en línea) con aviso de duplicados por `phone_e164`,
informe de Drive en `documents.kind='informe_cliente'`, historial de contacto con notas
(`fecha · texto`, menú de tres puntos), y las 7 Server Actions (`clients.ts` y `notes.ts`)
con Zod + `revalidatePath`. `npm run build`, `npm run lint` y `tsc` pasan sin errores.

### Decisiones de implementación

- **El botón "Eliminar contacto" no estaba ubicado en la especificación de la ficha**, pero la
  acción `deleteClient` y su criterio de aceptación lo exigen: se coloca junto a Editar en la
  cabecera (mismo patrón que 5.4 describe para "Eliminar proyecto"). Con proyectos asociados
  muestra el aviso explicativo y no borra (guardado también en la acción y en el `restrict`
  de la BD); sin proyectos pasa por `ConfirmDialog`.
- **`lib/schemas/client.ts` acepta `informe_url` sin esquema**: `z.string().url()` puro
  rechazaría "docs.google.com/x" antes de poder normalizarla (criterio: guardar una URL sin
  `https://` la almacena normalizada). El `refine` valida tras `normalizeUrl` y restringe a
  `http(s)` (rechaza `javascript:` por seguridad); la normalización se aplica al guardar en
  `createClient`/`updateClient`.
- **`lib/supabase/server.ts` se tipa con el genérico `Database`**: se creó sin él en la Fase 1
  y todas las consultas devolvían `any`; la sección 6 exige "lecturas tipadas" en
  `lib/queries/`. Sin el genérico no hay tipado posible.
- **Los recuentos del `FilterGroup` se calculan sobre el resultado buscado** (una sola
  consulta con `.or` + una de `client_id` de proyectos), y el filtro de estado se aplica en
  la página a las filas ya filtradas por búsqueda: los contadores siempre reflejan lo que
  cada botón mostraría con la búsqueda activa.
- **Fichero extra `ClientCreateDialog.tsx`** (no listado en la sección 6): el "Nuevo
  contacto" de la cabecera necesita el `ClientForm` dentro de un `Dialog`; mismo patrón de
  nombre que `ProjectCreateDialog` de la Fase 4.
- **"Último contacto" no lleva input ni en edición** (campo calculado por trigger, D-25) y
  el bloque Datos no lleva encabezado visible: la especificación solo marca "encabezado
  literal" en Informe y Proyectos. En edición, el encabezado Informe + el campo de URL
  viven dentro del mismo `<form>` que los datos (el `ClientForm` incluye `informe_url`).
- **`saveInformeDocument` hace el upsert a mano** (select + update/insert): el índice único
  parcial de `documents` no permite `onConflict` de PostgREST. Vaciar la URL en edición
  elimina el documento.
- **La ordenación por estado usa el orden del embudo** (potencial → en proceso → terminado →
  nada, M15), no el alfabético; se hace en cliente (volumen mono-usuario) y solo negocio,
  estado y nº de proyectos son ordenables, como exige la fase.
- **El compositor de notas es un `<input>` siempre visible** aunque la ficha esté en modo
  lectura: la propia fase lo exige en 3.2.5, de modo que el criterio "ningún `<input>` en
  modo lectura" se cumple en el bloque ver/editar (Datos + Informe), no en toda la ficha.
- **`createClient` (acción) colisiona con el helper de Supabase**: la acción conserva el
  nombre exigido por 3.4 y el helper se importa renombrado (`createSupabaseClient`).
- **Verificación con datos temporales contra la base real** (patrón de la Fase 1): `.or` de
  PostgREST con "juana"/"600"/"papel", lookup por `phone_e164`, `restrict` al borrar cliente
  con proyecto y trigger de `last_contact_at` verificados; base devuelta a vacío y
  `project_code_seq` restaurada a estado virgen. Las funciones puras (esquema Zod, E.164,
  normalización de URL) probadas en Node con los ficheros reales. El arranque en runtime
  se verificó una sola vez (middleware redirige las rutas nuevas a `/login`); el
  comportamiento interactivo del panel (clic de fila → panel, recarga → página completa)
  sigue el patrón exacto de 5.3 y queda pendiente de confirmación visual del usuario.

## Fase 2 — Autenticación y estructura de la aplicación (2026-09-15)

Implementada la autenticación por magic link y el esqueleto navegable de la app. En Supabase Auth
queda solo Email activo, se creó el usuario propietario `nicbarmercader7@gmail.com` (dispara
`handle_new_user` y crea la fila de `app_settings`) y se desactivó el registro abierto;
`site_url`/`uri_allow_list` apuntan a `http://localhost:3000`. Añadidos `middleware.ts` +
`lib/supabase/middleware.ts` (refresco de sesión y redirección a `/login`, con `/login`,
`/auth/callback` y `/api/calendar/*` públicos), `app/login/page.tsx`, `app/auth/callback/route.ts`,
`lib/actions/auth.ts`, `app/providers.tsx`, los componentes `Sidebar`, `MobileNav` y `PageHeader`,
el layout de `(app)` con su slot `panel` y los dos `default.tsx`, y las 7 páginas vacías con
`PageHeader` + `EmptyState`. `npm run build` y `npm run lint` pasan sin errores.

### Decisiones de implementación

- **`updateSession` vive en `lib/supabase/middleware.ts` y el `middleware.ts` raíz solo lo invoca**,
  respetando la estructura de carpetas de la sección 6 (la Fase 2 solo nombra el raíz).
- **`signOut` es una Server Action en `lib/actions/auth.ts`** (fichero no listado en la sección 6,
  pero necesario para limpiar cookies en servidor); se llama desde un `<form action={signOut}>`.
- **El login es un componente cliente** que usa el cliente de navegador y `window.location.origin`
  como `emailRedirectTo` hacia `/auth/callback`; estados enviando/enviado/error.
- **Las etiquetas de navegación se mantienen dentro de `Sidebar`**: `lib/constants/` solo alberga
  fases, estados y categorías según el plan.
- **Eliminada la página de prueba `app/page.tsx` de la Fase 0** porque `(app)/page.tsx` ocupa `/`.
- **Estado activo de la barra** por `usePathname` (`/` exacto, resto por prefijo), barra de 2 px de
  acento + `--bg-hover`; en móvil la misma `Sidebar` se reutiliza dentro del `Sheet` izquierdo.
- **Proveedor de TanStack Query en `app/providers.tsx`** (cliente) y `Toaster` de sonner con
  `theme="dark"` en el layout raíz.
- **Los textos de las 7 páginas son marcadores genéricos**, sin adelantar contenido de fases
  posteriores.

## Fase 1 — Base de datos y seguridad (2026-09-15)

Escritas y aplicadas las 13 migraciones (`supabase/migrations/0001` a `0013`) sobre el proyecto
Supabase `ldzzpaoszuriyuigvtiq` con `supabase db push`: enums, 7 funciones, 9 tablas públicas,
esquema `private.google_credentials`, RLS con política `owner_id = auth.uid()` en todas las
tablas y las 9 vistas con `security_invoker = true`. Creados los clientes Supabase
(`lib/supabase/{client,server,admin}.ts`), las constantes (`lib/constants/{phases,statuses,categories}.ts`),
los 10 esquemas Zod (`lib/schemas/`) y los helpers de normalización en `lib/utils.ts`.
Generado `types/database.ts` (tablas y vistas) con `supabase gen types typescript --project-id`.
Todos los criterios de aceptación verificados con un bloque DO de aserciones sobre la base real
(9 tareas y `PRJ-0001` al crear proyecto, `tasks_cost_allowed`, índice único de fase,
`last_contact_at`, timestamps de tarea, 4 filas del gasto mensual, rol `anon` ve 0 filas),
dejando después la base limpia y la secuencia de códigos virgen. `npm run build` sin errores.

### Decisiones de implementación

- **Las 7 funciones se crean en `0003` antes que las tablas.** El orden de ficheros es el
  exigido por el plan; los cuerpos en plpgsql se resuelven en ejecución, no al crear la
  función, así que no hay problema de referencias adelantadas.
- **`refresh_client_last_contact` se dispara en insert, update y delete de `client_notes`.**
  La sección 4.4 solo muestra la función; si solo se disparara al insertar, borrar la nota más
  reciente dejaría `last_contact_at` obsoleto.
- **La tarea 2 pedía "las 10 vistas" pero la sección 4.5 define exactamente 9.** Manda la
  sección 4.5 (registro de decisiones): se crean esas 9, ninguna inventada.
- **`v_db_general` y `v_project_totals` copiadas literal** de la sección 4.5. Las 7 restantes
  (no definidas en el plan) se han construido a partir de su especificación de la tabla 4.5 y
  de las fórmulas de la sección 7: `v_payments` añade días de retraso y los nombres de
  proyecto/cliente que exigen las pantallas; `v_monthly_cash` sigue la fórmula de beneficio
  neto de 7.1 (cobrado − tokens de tareas cerradas en el mes − gastos de proyecto − gastos
  generales) con rango desde el primer mes con datos; `v_phase_stats` incluye media y mediana
  de minutos y de coste por fase y nivel; `v_project_funnel` expone recuentos por estado y
  tasas de conversión.
- **`v_client_totals` se construye sobre `v_project_totals`**, no duplicando su lógica:
  facturado = `sum(price_net)`, cobrado/pendiente/horas/margen desde la vista base, y nº de
  proyectos desde `projects`.
- **`project_code_seq` restaurada a su estado virgen** (`setval(..., 1, false)`) tras la
  verificación: el primer proyecto real del usuario será `PRJ-0001`.
- **`gen types` ejecutado con token de acceso de Supabase** (la variante `--db-url` requiere
  Docker, no disponible en la máquina). El resultado es idéntico al comando del plan.
- **Esquemas Zod con Zod 4** (el del `package.json` de la Fase 0): `z.iso.date()` en lugar de
  `z.string().date()`, `z.coerce` para importes numéricos desde formularios (regla 8: dinero
  como `number` en TS, `numeric(12,2)` en BD). `taskCompletion` acepta horas y minutos
  separados y vacíos (D-02), y `businessExpense` valida `ends_on >= starts_on` igual que la BD.
- **`normalizePhoneE164` y `normalizeUrl` en `lib/utils.ts`** implementan las reglas 2.2.10
  y 2.2.11 para reutilizarlas desde los esquemas y las Server Actions.
- **`lib/supabase/admin.ts`** lleva el comentario de advertencia "SOLO SERVIDOR" en su primera
  línea, tal como exige la tarea 6, y no se importa desde ningún punto del código de cliente.

## Fase 0 — Preparación del proyecto y fundamentos (2026-09-14)

Scaffoldeado Next.js 15.5 (App Router, TypeScript estricto, sin `src/`, alias `@/*`) sobre el
repositorio `17-crm`, instaladas todas las dependencias del plan e inicializado shadcn/ui
(radix-nova, base neutral, lucide) con los 20 componentes base. Escrito el sistema de diseño
completo en `app/globals.css` (tokens de la sección 3.2 verbatim, expuestos como utilidades
Tailwind), fuentes Inter + Inter Tight, clase `.num` con dígitos tabulares y cuerpo a 13 px.
Creados `lib/format.ts`, `lib/dates.ts`, `lib/utils.ts` (cn), `.env.local.example`,
`components/shared/EmptyState.tsx` y la página de prueba en `/` (fondo base, tarjeta con borde
de 1 px, botón de acento y cifra en euros tabular). `npm run build` pasa sin errores ni
advertencias y no existe ningún emoji ni degradado en el proyecto.

### Decisiones de implementación

- **Next.js 15 fijado con `create-next-app@15`.** El comando del plan decía `@latest`, pero
  hoy `@latest` instala Next 16; el stack de la sección 1 exige Next.js 15, que manda.
- **`--no-src-dir` en lugar de `--src-dir=false`.** La CLI actual no acepta el sufijo `=false`
  (lanza prompt interactivo); la estructura de carpetas de la sección 6 exige `app/`, `lib/`
  y `components/` en la raíz.
- **Tailwind v4: tokens expuestos con `@theme inline` en `globals.css`.** En v4 ya no existe
  `tailwind.config.ts`; las utilidades requeridas (`bg-base`, `bg-surface`, `border-subtle`,
  `text-primary`, `accent`, …) quedan disponibles con el mismo nombre. Los CSS variables de
  la sección 3.2 se mantienen literales en `:root`.
- **App monotema oscura.** Los valores de la sección 3.2 son el tema único: no hay variante
  clara ni clase `.dark`. La semántica shadcn (`--background`, `--primary`, `--border`, …)
  se resuelve por alias contra los tokens del plan (una sola fuente de verdad).
- **Colisión de nombres resuelta reestilizando los componentes copiados.** shadcn usa
  `bg-primary`/`bg-secondary`/`bg-muted`/`bg-accent` con otra semántica; los tokens del plan
  ganan esos nombres de utilidad y los componentes ahora usan: `bg-accent` (botón principal,
  checkbox, día seleccionado), `bg-hover` (hover de menús, filas y botones fantasma),
  `bg-surface-2` (chips, esqueletos, pies elevados), `bg-inset` (campos de entrada). Sombras
  de paneles sustituidas por bordes de 1 px `--border-subtle`; radios fijados a 6 px en
  controles y 8 px máximo en tarjetas/paneles; textos `Close` traducidos a `Cerrar`.
- **`formatEUR` con `useGrouping: true`.** ICU moderno ya no agrupa por defecto en formato
  divisa es-ES y devolvía `1234,50 €`; con agrupación devuelve exactamente `1.234,50 €` como
  exige el criterio de aceptación.
- **`cn()` re-exportada del paquete `cn`** (convención de shadcn 4.x, misma firma
  clsx + tailwind-merge; ambos instalados igualmente por ser dependencias del plan).
- **Dependencias añadidas por el toolchain shadcn 4.x:** `shadcn`, `cn`, `tw-animate-css`,
  `radix-ui`, `next-themes` (usado por el toaster), `react-day-picker` (calendario).
- **Página de prueba en `app/page.tsx`** (ruta `/`), tal como piden los criterios de la
  Fase 0. Verificada en el HTML prerenderado por el build.
