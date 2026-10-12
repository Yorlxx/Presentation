import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isValidUUID, type Presentacion } from "@/lib/types";
import PerfilClient from "./PerfilClient";

export default async function PerfilPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isValidUUID(params.id)) notFound();

  const { data } = await supabase
    .from("presentaciones")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  return <PerfilClient m={data as Presentacion} />;
}
