// lib/constants/categories.ts
export const PAYMENT_MODE = {
  unico:  'De una vez',
  plazos: 'A plazos',
} as const;

export const PROJECT_EXPENSE_CATEGORY = {
  suscripcion:   'Suscripción',
  licencia:      'Licencia',
  dominio:       'Dominio',
  hosting:       'Hosting',
  subcontrata:   'Subcontrata',
  hardware:      'Hardware',
  software:      'Software',
  otros:         'Otros',
} as const;

export const BUSINESS_EXPENSE_CATEGORY = {
  ia_tokens: 'Tokens IA',
  software:  'Software',
  hosting:   'Hosting',
  dominio:   'Dominio',
  hardware:  'Hardware',
  gestoria:  'Gestoría',
  impuestos: 'Impuestos',
  formacion: 'Formación',
  otros:     'Otros',
} as const;

export const EXPENSE_RECURRENCE = {
  unico:      'Único',
  mensual:    'Mensual',
  trimestral: 'Trimestral',
  anual:      'Anual',
} as const;

// Claves derivadas de las etiquetas: única fuente de verdad (regla 24)
export const PAYMENT_MODE_KEYS = Object.keys(PAYMENT_MODE) as ReadonlyArray<keyof typeof PAYMENT_MODE>;
export const PROJECT_EXPENSE_CATEGORY_KEYS = Object.keys(PROJECT_EXPENSE_CATEGORY) as ReadonlyArray<keyof typeof PROJECT_EXPENSE_CATEGORY>;
export const BUSINESS_EXPENSE_CATEGORY_KEYS = Object.keys(BUSINESS_EXPENSE_CATEGORY) as ReadonlyArray<keyof typeof BUSINESS_EXPENSE_CATEGORY>;
export const EXPENSE_RECURRENCE_KEYS = Object.keys(EXPENSE_RECURRENCE) as ReadonlyArray<keyof typeof EXPENSE_RECURRENCE>;
