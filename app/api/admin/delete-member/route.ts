import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseStoragePublicUrl } from "@/lib/admin";

/**
 * POST /api/admin/delete-member
 * Borrado físico completo: fotos en Storage + filas en BD + auditoría.
 * Usa service_role: no depende de las políticas RLS de Storage.
 *
 * Body: { ids: string[] }
 * Auth: header Authorization: Bearer <access_token de admin o super_admin>
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Falta configuración de Supabase en el servidor." },
      { status: 500 }
    );
  }
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Falta la variable SUPABASE_SERVICE_ROLE_KEY en el entorno" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await caller.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  }

  const admin = createClient(url, serviceKey);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!roleRow || (roleRow.role !== "admin" && roleRow.role !== "super_admin")) {
    return NextResponse.json(
      { error: "Solo administradores pueden eliminar fichas." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((x: unknown): x is string => typeof x === "string" && x.length > 0).slice(0, 100)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Sin fichas para eliminar." }, { status: 400 });
  }

  // 1. Rutas de fotos antes de borrar las filas
  const { data: rows } = await admin
    .from("presentaciones")
    .select("id,nombre,foto_url")
    .in("id", ids);
  const byBucket = new Map<string, string[]>();
  for (const r of (rows ?? []) as { foto_url: string | null }[]) {
    const p = parseStoragePublicUrl(r.foto_url);
    if (!p) continue;
    byBucket.set(p.bucket, [...(byBucket.get(p.bucket) ?? []), p.path]);
  }

  // 2. Borrado físico en Storage (se cuentan los que realmente salieron)
  let failedPhotos = 0;
  for (const [bucket, paths] of Array.from(byBucket.entries())) {
    const { data: removed, error } = await admin.storage.from(bucket).remove(paths);
    const okCount = removed?.length ?? 0;
    if (error || okCount < paths.length) failedPhotos += paths.length - okCount;
  }

  // 3. Borrado de filas
  const { error: delErr } = await admin.from("presentaciones").delete().in("id", ids);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 4. Auditoría
  await admin.from("admin_activity").insert({
    admin_id: user.id,
    admin_email: user.email,
    action: ids.length > 1 ? "BULK_DELETE" : "DELETE",
    details: JSON.stringify(
      ids.length > 1
        ? { count: ids.length }
        : { id: ids[0], nombre: (rows?.[0] as { nombre?: string } | undefined)?.nombre }
    ),
  });

  return NextResponse.json({ ok: true, deleted: ids.length, failedPhotos });
}
