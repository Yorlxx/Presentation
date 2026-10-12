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

export async function getMyRole(): Promise<"admin" | "super_admin" | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!data) return null;
  return data.role as "admin" | "super_admin";
}
