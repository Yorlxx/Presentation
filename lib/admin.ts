import { supabase } from "./supabaseClient";

/** Inserta log de auditoría silenciosa. Nunca debe romper el flujo principal. */
export async function logAdminActivity(
  action: string,
  details?: string | Record<string, unknown>
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_activity").insert({
      admin_id: user.id,
      admin_email: user.email,
      action,
      details:
        typeof details === "string" ? details : JSON.stringify(details ?? {}),
    });
  } catch {
    // Silencioso por diseño
  }
}

/** Devuelve el id del usuario con sesión activa, o null si no hay sesión. */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Resiliente ante registros antiguos sin la columna aprobado:
 * undefined/null se consideran aprobados (true) para no romper el render.
 */
export function isAprobado(m: { aprobado?: boolean | null }): boolean {
  return m.aprobado !== false;
}

/** Extrae {bucket, path} de una public URL de Supabase Storage */
export function parseStoragePublicUrl(
  url: string | null | undefined
): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/**
 * Borra la foto de Storage (best-effort: nunca lanza; devuelve false si falla
 * para no bloquear el borrado de la fila en ese caso).
 */
export async function deleteMemberPhoto(
  fotoUrl: string | null | undefined
): Promise<boolean> {
  const parsed = parseStoragePublicUrl(fotoUrl);
  if (!parsed) return true; // sin foto: nada que borrar
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  if (error) {
    console.warn("[deleteMemberPhoto]", error.message);
    return false;
  }
  return true;
}

/** Borrado completo: foto en Storage + fila en BD + auditoría */
export async function deleteMember(m: {
  id: string;
  nombre: string;
  foto_url: string | null;
}): Promise<{ error?: string; photoError?: string }> {
  const photoOk = await deleteMemberPhoto(m.foto_url);
  const { error } = await supabase.from("presentaciones").delete().eq("id", m.id);
  if (error) return { error: error.message };
  await logAdminActivity("DELETE", { id: m.id, nombre: m.nombre });
  if (!photoOk) {
    return {
      photoError:
        "la foto no pudo borrarse de Storage (revisa la política DELETE del bucket 'fotos')",
    };
  }
  return {};
}

export async function getMyRole(): Promise<"admin" | "super_admin" | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // maybeSingle(): null si no hay fila, error distinguible si es RLS/red.
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    // PGRST116 = sin filas con .single(); con maybeSingle no ocurre.
    // Cualquier otro error (p.ej. "infinite recursion" por RLS) se propaga
    // a consola para no confundirlo con "usuario sin rol".
    console.error("[getMyRole] error leyendo user_roles:", error.message);
    return null;
  }
  if (!data) return null;
  if (data.role !== "admin" && data.role !== "super_admin") {
    console.warn("[getMyRole] rol inesperado:", data.role);
    return null;
  }
  return data.role;
}
