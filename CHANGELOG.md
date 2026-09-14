# Changelog

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
