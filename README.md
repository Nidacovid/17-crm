# 17-crm

CRM mono-usuario para gestión de clientes, proyectos, tareas, pagos, gastos y métricas.
Interfaz en español (es-ES), moneda EUR y zona horaria `Europe/Madrid`.

Stack: Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS · shadcn/ui ·
TanStack Query · Zod · React Hook Form · Recharts · Supabase (PostgreSQL + Auth + RLS) ·
Google Calendar (googleapis) · SheetJS.

---

## Requisitos

- Node.js 20 o superior.
- Una cuenta de [Supabase](https://supabase.com).
- (Opcional) Una cuenta de Google Cloud con Calendar API activada.
- (Despliegue) Una cuenta de [Vercel](https://vercel.com) conectada a GitHub.

---

## Arranque local

```bash
npm install
cp .env.local.example .env.local   # rellenar los valores
npm run dev
```

La app queda en http://localhost:3000.

Comandos disponibles:

```bash
npm run dev      # servidor de desarrollo (Turbopack)
npm run build    # build de producción (Turbopack)
npm run start    # servir el build de producción
npm run lint     # ESLint
```

---

## Variables de entorno

Todas se definen en `.env.local` (local) y en el panel de Vercel (producción).
Ver `.env.local.example`.

| Variable | Ámbito | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Clave anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Clave de servicio. Nunca en `NEXT_PUBLIC_*` |
| `GOOGLE_CLIENT_ID` | solo servidor | OAuth de Google Cloud |
| `GOOGLE_CLIENT_SECRET` | solo servidor | OAuth de Google Cloud |
| `GOOGLE_REDIRECT_URI` | solo servidor | Opcional. Si falta, se deriva de `NEXT_PUBLIC_APP_URL` |
| `ENCRYPTION_KEY` | solo servidor | Clave AES-256-GCM de 32 bytes en base64 (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | público | URL base de la app (p. ej. `https://tu-app.vercel.app`) |

> `ENCRYPTION_KEY` **debe ser la misma** en local y en producción: cifra y descifra los
> tokens de Google en `private.google_credentials`. Cambiarla invalida los tokens guardados.

---

## Base de datos (Supabase)

Las migraciones viven en `supabase/migrations/` y se aplican **en orden** con la CLI de Supabase:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Reglas de seguridad ya incluidas en las migraciones:

- RLS activo en todas las tablas (política `owner_id = auth.uid()`).
- Todas las vistas creadas con `security_invoker = true`.
- El esquema `private` (tokens de Google) no es accesible desde el cliente.

En **Authentication → URL Configuration** de Supabase hay que añadir:

- *Site URL*: `https://<tu-dominio>`
- *Redirect URLs*: `https://<tu-dominio>/auth/callback`

---

## Google Calendar (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com): crear credenciales OAuth 2.0
   de tipo *Aplicación web* y activar la **Google Calendar API**.
2. Añadir como **URI de redirección autorizada**:
   - `http://localhost:3000/api/google/callback`
   - `https://<tu-dominio>/api/google/callback`
3. Definir `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

Avisos:

- Mientras la app OAuth esté en modo **Testing**, el *refresh token* caduca a los 7 días.
  Publicar la app en Google Cloud para evitarlo.
- Adicionalmente la app publica un feed `.ics` propio como respaldo (token en `app_settings.ics_token`).

---

## Despliegue en Vercel

1. Subir el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importar el repo.
   Vercel detecta Next.js automáticamente; no hay que cambiar el build.
3. En **Settings → Environment Variables** añadir todas las variables de la tabla superior
   (entorno *Production*, y *Preview* si se quiere).
4. **Deploy**. Vercel asigna un dominio `https://<proyecto>.vercel.app`.
5. Poner ese dominio en `NEXT_PUBLIC_APP_URL` y volver a desplegar.
6. Añadir el dominio a Google Cloud (redirect URI) y a Supabase (Site URL y Redirect URLs).
7. A partir de ahí, cada `git push` a `main` despliega automáticamente.

### Avisos importantes

- **Vercel Hobby prohíbe el uso comercial** y esta app gestiona facturación real.
  Alternativas: plan Vercel Pro o Cloudflare Pages (sin esa cláusula).
- El plan gratuito de **Supabase no tiene copias de seguridad automáticas**.
  Exportar a `.xlsx` periódicamente como respaldo manual.
- El proyecto de Supabase gratuito **se pausa tras 7 días sin actividad**; se reactiva
  desde el panel en un minuto.
