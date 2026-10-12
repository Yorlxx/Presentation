-- ============================================================
-- PRESENTACIONES WA — Schema Supabase (PostgreSQL + RLS + Storage)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabla presentaciones
create table if not exists public.presentaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad int check (edad is null or (edad > 0 and edad < 150)),
  pais text,
  genero text,
  whatsapp_user text,
  anime_favorito text,
  color_favorito text,
  musica_favorita text,
  pasatiempos text,
  gustos text,
  disgustos text,
  personalidad text,
  dato_curioso text,
  foto_url text,
  created_at timestamptz default now()
);

-- 2. Roles de admin
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'super_admin'))
);

-- 3. Auditoría silenciosa
create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null,
  details text,
  created_at timestamptz default now()
);

-- 4. RLS
alter table public.presentaciones enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_activity enable row level security;

-- presentaciones: lectura pública, escritura pública (formulario sin login),
-- update/delete solo admins. Ajusta a tu gusto.
drop policy if exists "public read" on public.presentaciones;
create policy "public read"
  on public.presentaciones for select
  to anon, authenticated
  using (true);

drop policy if exists "public insert" on public.presentaciones;
create policy "public insert"
  on public.presentaciones for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admin update" on public.presentaciones;
create policy "admin update"
  on public.presentaciones for update
  to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

drop policy if exists "admin delete" on public.presentaciones;
create policy "admin delete"
  on public.presentaciones for delete
  to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

-- user_roles: solo lectura/escritura para admins autenticados con rol
drop policy if exists "admins read roles" on public.user_roles;
create policy "admins read roles"
  on public.user_roles for select
  to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

drop policy if exists "super_admin manage roles" on public.user_roles;
create policy "super_admin manage roles"
  on public.user_roles for all
  to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'super_admin'))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'super_admin'));

-- admin_activity: insert para admins, select solo super_admin
drop policy if exists "admins insert logs" on public.admin_activity;
create policy "admins insert logs"
  on public.admin_activity for insert
  to authenticated
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

drop policy if exists "super_admin read logs" on public.admin_activity;
create policy "super_admin read logs"
  on public.admin_activity for select
  to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- 5. Storage: bucket "fotos" público (solo lectura), subida pública
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "public read fotos" on storage.objects;
create policy "public read fotos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotos');

drop policy if exists "public upload fotos" on storage.objects;
create policy "public upload fotos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'fotos');

drop policy if exists "admin delete fotos" on storage.objects;
create policy "admin delete fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos');

-- 6. Crear tu primer super_admin (reemplaza UID y email tras crear el usuario en Auth):
-- insert into public.user_roles (user_id, email, role)
-- values ('TU-UID-DE-AUTH-USERS', 'tu@email.com', 'super_admin');
