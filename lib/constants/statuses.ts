// lib/constants/statuses.ts
export const CLIENT_STATUS = {
  terminado:  'Cliente terminado',
  en_proceso: 'Cliente en proceso',
  potencial:  'Cliente potencial',
  nada:       'Nada',
} as const;

export const PROJECT_STATUS = {
  a_empezar:     'A empezar',
  en_desarrollo: 'En desarrollo',
  terminado:     'Terminado',
  cancelado:     'Cancelado',
} as const;

export const TASK_STATUS = {
  todo: 'To do',
  doing: 'En curso',
  done: 'Finished',
} as const;

export const DOCUMENT_KIND = {
  informe_cliente:  'Informe cliente',
  informe_proyecto: 'Informe Proyecto',
  contrato:         'Contrato',
  repositorio:      'Repositorio',
  pys:              'PyS',
  guia_uso:         'Guía uso personal',
  otro:             'Otro',
} as const;

// Orden exacto de los bloques de documentos en la ficha de proyecto
export const PROJECT_DOC_ORDER = [
  'informe_proyecto', 'contrato', 'repositorio', 'pys', 'guia_uso',
] as const;

// Estado derivado de los pagos (v_payments, sección 4.3): nunca se almacena
export const PAYMENT_STATUS = {
  pagado:    'Pagado',
  pendiente: 'Pendiente',
  vencido:   'Vencido',
} as const;

// Estado interno de sincronización con Google Calendar (D-12)
export const SYNC_STATE = {
  pendiente:   'Pendiente',
  sincronizado: 'Sincronizado',
  error:       'Error',
  no_aplica:   'No aplica',
} as const;

// Claves derivadas de las etiquetas: única fuente de verdad (regla 24)
export const CLIENT_STATUS_KEYS = Object.keys(CLIENT_STATUS) as ReadonlyArray<keyof typeof CLIENT_STATUS>;
export const PROJECT_STATUS_KEYS = Object.keys(PROJECT_STATUS) as ReadonlyArray<keyof typeof PROJECT_STATUS>;
export const TASK_STATUS_KEYS = Object.keys(TASK_STATUS) as ReadonlyArray<keyof typeof TASK_STATUS>;
export const DOCUMENT_KIND_KEYS = Object.keys(DOCUMENT_KIND) as ReadonlyArray<keyof typeof DOCUMENT_KIND>;
export const PAYMENT_STATUS_KEYS = Object.keys(PAYMENT_STATUS) as ReadonlyArray<keyof typeof PAYMENT_STATUS>;
export const SYNC_STATE_KEYS = Object.keys(SYNC_STATE) as ReadonlyArray<keyof typeof SYNC_STATE>;
