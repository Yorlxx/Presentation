import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/mi-ficha?id=<uuid>
 * Devuelve la ficha propia del dispositivo (incluso pendiente) para
 * precargar el editor. Solo si la cookie coincide con el id pedido.
 */
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Falta configuración del servidor." },
      { status: 500 }
    );
  }

  const id = new URL(req.url).searchParams.get("id");
  const stored = cookies().get("my_presentation_id")?.value;
  if (!id || !stored || stored !== id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin
    .from("presentaciones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Ficha no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ficha: data });
}
