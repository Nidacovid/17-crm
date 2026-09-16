// Cualquier navegación suave que no case con una ruta interceptada del slot
// (@panel/(.)proyectos/[id] o @panel/(.)contactos/[id]) hace que el panel se
// renderice vacío y se cierre. Sin esto, Next.js mantiene el subpage activo
// del slot al navegar a rutas anidadas (p. ej. /proyectos/[id]/tareas) y el
// panel se queda superpuesto sobre el kanban.
export default function CatchAll() {
  return null;
}
