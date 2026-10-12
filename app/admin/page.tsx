"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminStats from "@/components/AdminStats";
import TopPaises from "@/components/TopPaises";
import ReloadButton from "@/components/ReloadButton";
import MemberManagementTable from "@/components/MemberManagementTable";
import { useSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  // Rol leído del contexto global en memoria: sin llamadas a la BD al cambiar de vista
  const { role, loading } = useSession();
  const authorized = !loading && (role === "admin" || role === "super_admin");
  // Bump para refrescar KPIs y Top Países tras cada mutación de la tabla
  const [statsKey, setStatsKey] = useState(0);

  useEffect(() => {
    if (!loading && !authorized) router.replace("/login");
  }, [loading, authorized, router]);

  // Solo la verificación inicial muestra carga; al navegar con el rol ya
  // verificado el panel renderiza inmediatamente. Nada sensible sin rol.
  if (!authorized) {
    return <p className="py-10 text-center text-zinc-500">Verificando acceso…</p>;
  }

  return (
    <div className="-mx-4 -my-6">
      <AdminSidebar />
      <div className="max-w-5xl space-y-4 p-4 md:py-6 md:pl-[272px] md:pr-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">Gestión de Integrantes</h1>
            <p className="text-sm text-zinc-400">
              Buscar, editar o borrar presentaciones
            </p>
          </div>
          <ReloadButton />
        </div>
        <AdminStats refreshKey={statsKey} />
        <TopPaises refreshKey={statsKey} />
        <MemberManagementTable onChanged={() => setStatsKey((k) => k + 1)} />
      </div>
    </div>
  );
}
