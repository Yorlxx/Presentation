"use client";

import AdminTable from "@/components/AdminTable";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">🛡️ Moderación</h1>
          <p className="text-sm text-zinc-400">Buscar, editar o borrar presentaciones</p>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          Salir
        </button>
      </div>
      <AdminTable />
    </div>
  );
}
