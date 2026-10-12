-- ============================================================
-- MIGRACIÓN: sistema antispam con aprobación previa
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- NO borra datos. Las fichas existentes quedan aprobadas para
-- no vaciar la galería pública.
-- ============================================================

-- 1. Columna aprobado (default false = pendiente de moderación)
alter table public.presentaciones
  add column if not exists aprobado boolean not null default false;

-- 2. Las fichas creadas antes de la moderación se consideran aprobadas
update public.presentaciones
  set aprobado = true
  where aprobado = false;

-- 3. RLS: público solo ve aprobadas; admins ven todo
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

-- 4. Forzar recarga del schema cache de PostgREST para que la
-- columna quede visible de inmediato (evita "column not found
-- in the schema cache")
notify pgrst, 'reload schema';
