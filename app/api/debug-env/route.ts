import { NextResponse } from "next/server";

/**
 * GET /api/debug-env — Diagnóstico SIN secretos: devuelve solo el
 * project ref deducido de NEXT_PUBLIC_SUPABASE_URL para verificar
 * a qué proyecto apunta la app servida (túnel/Vercel/local).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return NextResponse.json({
    projectRef: m ? m[1] : null,
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
