-- ============================================================
-- PARCHE: fix recursión infinita RLS en user_roles
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- NO borra datos. Solo reemplaza políticas y crea 2 funciones helper.
-- ============================================================

-- 1. Helpers SECURITY DEFINER (bypasean RLS, rompen la recursión)
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

-- 2. user_roles: eliminar políticas recursivas
drop policy if exists "admins read roles" on public.user_roles;
drop policy if exists "super_admin manage roles" on public.user_roles;
drop policy if exists "own role read" on public.user_roles;

-- Lectura propia SIN subconsulta (comparación directa, cero recursión)
create policy "own role read"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- Gestión solo super_admin vía helper (no toca user_roles bajo RLS)
create policy "super_admin manage roles"
  on public.user_roles for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 3. presentaciones: reemplazar EXISTS recursivos por helper
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

-- 4. admin_activity: idem
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

-- 5. Verificación (debe devolver 2 filas: is_admin, is_super_admin)
-- select proname, prosecdef from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and proname in ('is_admin','is_super_admin');
