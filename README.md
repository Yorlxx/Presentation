# Presentaciones WA

Galería responsive (mobile-first) de presentaciones de un grupo de WhatsApp.
Next.js 14 (App Router) + Tailwind + Supabase.

## 1. Configurar Supabase

1. Crea un proyecto en https://supabase.com
2. Ve a **SQL Editor** y ejecuta `supabase/schema.sql`
3. Ve a **Authentication > Users > Add user** y crea tu admin
4. Copia su UID y ejecútalo como `super_admin`:
   ```sql
   insert into public.user_roles (user_id, email, role)
   values ('UID', 'tu@email.com', 'super_admin');
   ```
5. Verifica el bucket `fotos` en **Storage** (lo crea el SQL).

## 2. Variables de entorno

```bash
cp .env.local.example .env.local
# edita NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 3. Ejecutar

```bash
npm install
npm run dev
```

Rutas:
- `/` galería pública con blur-reveal + búsqueda
- `/presentarme` formulario + compresión .webp + compartir en WhatsApp
- `/perfil/[id]` carnet (404 si UUID inválido o eliminado)
- `/login` acceso admin (log silencioso `LOGIN`)
- `/admin` moderación
- `/super-admin` admins + logs realtime

## 4. Despliegue en Vercel

1. Sube a GitHub, importa en Vercel
2. Agrega las 2 env vars en **Settings > Environment Variables**
3. Deploy. No se necesita adaptar nada para GitHub Pages (la app requiere SSR para `/perfil/[id]`; usa Vercel).

## Privacidad de fotos

- `ProtectedImage`: `select-none pointer-events-none [-webkit-touch-callout:none]`, overlay transparente anti clic-derecho/long-press, blur-xl → blur-0 con tap.
