-- ============================================================
-- PARCHE: borrado físico de fotos por administradores
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- Requisito: la función public.is_admin() debe existir
-- (la crea supabase/fix_rls_recursion.sql; ejecútalo antes si falta).
-- ============================================================

drop policy if exists "admin delete fotos" on storage.objects;
create policy "admin delete fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

notify pgrst, 'reload schema';
