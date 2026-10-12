import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidLoginInput, toAuthEmail } from "@/lib/username";

/**
 * POST /api/admin/create-user
 * Crea un administrador sin pasar por el rate limit de emails de signUp
 * y sin alterar la sesión del super admin que hace la petición.
 *
 * Body: { email: string (correo o usuario simple), password (mín. 6), role }
 * Acepta usuario simple ("admin1") y lo normaliza a "admin1@grupo.local".
 * Auth: header Authorization: Bearer <access_token del super admin>
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

  // 1. Verificar quién llama (cliente anon + token del usuario)
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

  // 2. Exigir rol super_admin (cliente service_role: sin RLS, sin recursión)
  const admin = createClient(url, serviceKey);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!roleRow || roleRow.role !== "super_admin") {
    return NextResponse.json(
      { error: "Solo un super_admin puede crear administradores." },
      { status: 403 }
    );
  }

  // 3. Validar payload (acepta correo completo o usuario simple)
  const body = await req.json().catch(() => null);
  const rawInput = String(body?.email ?? "");
  if (!isValidLoginInput(rawInput)) {
    return NextResponse.json(
      { error: "Ingresa un usuario válido (ej. admin1) o un correo válido." },
      { status: 400 }
    );
  }
  // Normalización: sin @ -> ${input}@grupo.local
  const email = toAuthEmail(rawInput);
  const username = rawInput.trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = body?.role;
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  // 4. Crear usuario confirmado (sin enviar correos, sin rate limit).
  // Guarda el identificador limpio en user_metadata y el correo
  // sintético en el email de Auth para mantener consistencia.
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }
  const newId = created.user?.id;
  if (!newId) {
    return NextResponse.json(
      { error: "No se pudo crear el usuario." },
      { status: 500 }
    );
  }

  // 5. Asignar rol
  const { error: roleErr } = await admin
    .from("user_roles")
    .upsert({ user_id: newId, email, role });
  if (roleErr) {
    return NextResponse.json({ error: roleErr.message }, { status: 500 });
  }

  // 6. Auditoría (actor = super admin que llamó)
  await admin.from("admin_activity").insert({
    admin_id: user.id,
    admin_email: user.email,
    action: "CREATE_ADMIN",
    details: JSON.stringify({ username, email, role }),
  });

  return NextResponse.json({ ok: true, user_id: newId });
}
