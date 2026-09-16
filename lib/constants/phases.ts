// lib/constants/phases.ts
export const PHASES = [
  { key: 'inicio_cliente',   label: 'Inicio cliente',   order: 1, allowsCost: false },
  { key: 'planificacion',    label: 'Planificación',    order: 2, allowsCost: true  },
  { key: 'fases',            label: 'Fases',            order: 3, allowsCost: true  },
  { key: 'bugs',             label: 'Bugs',             order: 4, allowsCost: true  },
  { key: 'probando',         label: 'Probando',         order: 5, allowsCost: false },
  { key: 'ajustes',          label: 'Ajustes',          order: 6, allowsCost: true  },
  { key: 'revision_cliente', label: 'Revisión cliente', order: 7, allowsCost: false },
  { key: 'retoques',         label: 'Retoques',         order: 8, allowsCost: true  },
  { key: 'auditorias',       label: 'Auditorías',       order: 9, allowsCost: true  },
] as const;

export type PhaseKey = (typeof PHASES)[number]['key'];

// Claves derivadas de PHASES: única fuente de verdad (regla 24)
export const PHASE_KEYS = PHASES.map((p) => p.key) as ReadonlyArray<PhaseKey>;

// D-04: solo 6 fases admiten coste. Las tareas personalizadas (phase null)
// también lo admiten (D-22).
export function phaseAllowsCost(phase: PhaseKey | null | undefined): boolean {
  if (phase === null || phase === undefined) return true;
  return PHASES.find((p) => p.key === phase)?.allowsCost ?? false;
}
