-- ============================================================
-- PARCHE v2: registro público de fichas (error 42501 persistente)
-- El INSERT exige que TODAS las políticas aplicables se cumplan:
-- si quedó una política vieja restrictiva, hay que eliminarla.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 0. Diagnóstico: muestra las políticas INSERT actuales (ver Results)
select policyname, cmd, roles, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'presentaciones' and cmd = 'INSERT';

-- 1. Borra TODAS las políticas INSERT existentes (incluidas plantillas
-- como "Enable insert for authenticated users only")
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'presentaciones' and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.presentaciones', p.policyname);
  end loop;
end $$;

-- 2. Crea la única política INSERT: registro público, siempre pendiente
create policy "public insert"
  on public.presentaciones for insert
  to anon, authenticated
  with check (aprobado is not true);

-- 3. Subida pública/anónima al bucket fotos (formulario sin login)
drop policy if exists "public upload fotos" on storage.objects;
drop policy if exists "Permitir subida pública de fotos" on storage.objects;
create policy "Permitir subida pública de fotos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'fotos');

notify pgrst, 'reload schema';
