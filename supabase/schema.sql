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
  aprobado boolean not null default false,
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

-- 4.1 Funciones helper con SECURITY DEFINER.
-- Bypasean RLS al consultar user_roles, rompiendo la recursión infinita
-- que ocurre cuando una policy sobre user_roles hace EXISTS sobre user_roles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- presentaciones: lectura pública SOLO aprobadas; admins ven todo (incluye pendientes).
-- update/delete solo admins. Ajusta a tu gusto.
drop policy if exists "public read" on public.presentaciones;
drop policy if exists "public read approved" on public.presentaciones;
create policy "public read approved"
  on public.presentaciones for select
  to anon, authenticated
  using (aprobado = true);

drop policy if exists "admin read all" on public.presentaciones;
create policy "admin read all"
  on public.presentaciones for select
  to authenticated
  using (public.is_admin());

drop policy if exists "public insert" on public.presentaciones;
create policy "public insert"
  on public.presentaciones for insert
  to anon, authenticated
  with check (aprobado is not true);

drop policy if exists "admin update" on public.presentaciones;
create policy "admin update"
  on public.presentaciones for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete" on public.presentaciones;
create policy "admin delete"
  on public.presentaciones for delete
  to authenticated
  using (public.is_admin());

-- user_roles: SIN subconsultas a la misma tabla.
-- Cada usuario lee su propia fila con comparación directa (no recursión).
drop policy if exists "admins read roles" on public.user_roles;
create policy "own role read"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "super_admin manage roles" on public.user_roles;
create policy "super_admin manage roles"
  on public.user_roles for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- admin_activity: usa helpers SECURITY DEFINER (sin EXISTS directo a user_roles)
drop policy if exists "admins insert logs" on public.admin_activity;
create policy "admins insert logs"
  on public.admin_activity for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "super_admin read logs" on public.admin_activity;
create policy "super_admin read logs"
  on public.admin_activity for select
  to authenticated
  using (public.is_admin());

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
  using (bucket_id = 'fotos' and public.is_admin());

-- 6. Crear tu primer super_admin (reemplaza UID y email tras crear el usuario en Auth):
-- insert into public.user_roles (user_id, email, role)
-- values ('TU-UID-DE-AUTH-USERS', 'tu@email.com', 'super_admin');
