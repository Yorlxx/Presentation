"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTable from "@/components/AdminTable";
import { AdminLogs, ManageAdmins } from "@/components/SuperAdminPanels";
import { supabase } from "@/lib/supabaseClient";
import { getMyRole } from "@/lib/admin";

export default function SuperAdminPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const role = await getMyRole();
      if (role !== "super_admin") {
        router.push(role === "admin" ? "/admin" : "/login");
        return;
      }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <p className="text-zinc-400">Verificando permisos…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">👑 Super Admin</h1>
          <p className="text-sm text-zinc-400">
            Moderación + gestión de admins + auditoría
          </p>
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
      <ManageAdmins />
      <AdminTable />
      <AdminLogs />
    </div>
  );
}
