# Presentaciones WA

Galería responsive (mobile-first) de presentaciones de un grupo de WhatsApp, con moderación previa, panel admin/super-admin y reconocimiento persistente del integrante en su dispositivo.

**Stack:** Next.js 14 (App Router) + React 18 + Tailwind CSS (dark) + Supabase (Postgres, Auth, Storage) + `lucide-react` (0 emojis en la UI) + `sonner` (toasts).

## 1. Configurar Supabase

1. Crea un proyecto en https://supabase.com
2. En **SQL Editor**, ejecuta en este orden:
   - `supabase/schema.sql` (tablas, RLS, bucket `fotos`, helpers `is_admin`/`is_super_admin`)
   - `supabase/fix_rls_recursion.sql` (si tu BD es anterior al fix de recursión)
   - `supabase/add_aprobado.sql` (columna de moderación; marca lo existente como aprobado)
   - `supabase/fix_public_insert.sql` (registro público + subida anónima)
   - `supabase/fix_storage_delete.sql` (borrado físico de fotos por admins)
3. En **Authentication > Users > Add user**, crea tu cuenta y regístrala como super admin:
   ```sql
   insert into public.user_roles (user_id, email, role)
   values ('TU-UID', 'admin1', 'super_admin');
   ```
   Puedes usar usuario simple (`admin1` → `admin1@grupo.local`) o correo real.
4. (Opcional) En **Database > Replication**, activa Realtime para `admin_activity` (si no, el timeline usa polling cada 30s).

## 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

| Variable | Dónde se usa | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente + API | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente + API | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor (endpoints) | `sb_secret_...` |

La service key se obtiene en Dashboard → Settings → API. Sin ella, `/api/admin/*` responde 500.

## 3. Ejecutar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # producción
```

> Las `NEXT_PUBLIC_*` se incrustan al arrancar: tras editar `.env.local`, reinicia el dev server.

## 4. Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Galería (solo aprobadas), buscador, paginación de 12, banner y botón Mi Ficha si el dispositivo tiene ficha |
| `/presentarme` | Público | Registro con foto WebP (800px/q0.8, sin HEIC), antiduplicados por WhatsApp, modo `?edit=true` para editar la ficha propia |
| `/perfil/[id]` | Público | Carnet (banda Pendiente si es propia, autolimpieza si fue borrada, botón Editar Mi Ficha) |
| `/login` | Público | Acepta usuario o correo; redirect por rol |
| `/admin` | admin+ | KPIs, Top Países, tabla responsive (filtros, bulk, CSV, paginación, aprobar/borrar con borrado físico de foto) |
| `/super-admin` | super_admin | 3 vistas por sidebar: Integrantes, Admins (crear con contraseña + lista), Auditoría (timeline realtime) |
| `/api/admin/create-user` | super_admin | Alta de admins sin rate limit (`service_role`) |
| `/api/admin/delete-member` | admin+ | Borrado físico (foto + fila + log) |
| `/api/mi-ficha` | Dueño (cookie) | Lee la ficha propia (incluso pendiente) para editor/verificación |
| `/api/debug-env` | Público | Muestra solo el project ref (diagnóstico, sin secretos) |

## 5. Despliegue en Vercel

1. Sube a GitHub, importa en Vercel.
2. Agrega las **3 env vars** en Settings → Environment Variables.
3. Deploy. (La app requiere SSR/node runtime para `/perfil/[id]` y `/api/*`; no es apta para GitHub Pages estático.)

## Notas

- **Moderación:** toda ficha nace con `aprobado = false`; la galería solo muestra aprobadas.
- **Persistencia:** `my_presentation_id` en localStorage + cookie a 1 año, con sincronización y verificación silenciosa.
- **Fotos:** `ProtectedImage` con blur-reveal, anti clic-derecho/long-press y `select-none`.
