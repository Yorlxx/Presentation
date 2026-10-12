import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { isValidUUID, type Presentacion } from "@/lib/types";
import PerfilClient from "./PerfilClient";
import PerfilMissing from "./PerfilMissing";

export default async function PerfilPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isValidUUID(params.id)) notFound();

  // Lectura pública (respeta RLS: las pendientes son invisibles aquí)
  const { data } = await supabase
    .from("presentaciones")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (data) return <PerfilClient m={data as Presentacion} />;

  // null = borrada O pendiente invisible por RLS. Solo la ficha propia
  // del dispositivo se re-verifica (leer cookies sí está permitido).
  const stored = cookies().get("my_presentation_id")?.value;
  if (stored === params.id) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      const admin = createClient(url, serviceKey);
      const { data: real } = await admin
        .from("presentaciones")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      // Pendiente: se muestra con su banda (la galería sigue filtrando)
      if (real) return <PerfilClient m={real as Presentacion} />;
    }
    // No existe: el cliente limpia la memoria y redirige (aquí no se
    // pueden modificar cookies: solo en Actions/Route Handlers)
    return <PerfilMissing id={params.id} />;
  }
  notFound();
}
