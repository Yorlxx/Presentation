"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar, { type AdminTab } from "@/components/AdminSidebar";
import ReloadButton from "@/components/ReloadButton";
import AdminStats from "@/components/AdminStats";
import TopPaises from "@/components/TopPaises";
import MemberManagementTable from "@/components/MemberManagementTable";
import { AdminLogs, ManageAdmins, SuperAdminStats } from "@/components/SuperAdminPanels";
import { useSession } from "@/components/SessionProvider";

const HEADERS: Record<AdminTab, { title: string; sub: string }> = {
  integrantes: {
    title: "Gestión de Integrantes",
    sub: "KPIs, filtros, aprobación y moderación de fichas",
  },
  admins: {
    title: "Administradores del Sistema",
    sub: "Cuentas, roles y accesos",
  },
  auditoria: {
    title: "Registro de Auditoría",
    sub: "Actividad reciente del sistema",
  },
};

export default function SuperAdminPage() {
  const router = useRouter();
  // Rol leído del contexto global en memoria: sin llamadas a la BD al cambiar de vista
  const { role, loading } = useSession();
  const authorized = !loading && role === "super_admin";
  // Estado explícito de la vista activa (lo controla el sidebar)
  const [activeTab, setActiveTab] = useState<AdminTab>("integrantes");
  // Bump para refrescar KPIs y Top Países tras cada mutación de la tabla
  const [statsKey, setStatsKey] = useState(0);

  useEffect(() => {
    if (!loading && !authorized) router.replace("/login");
  }, [loading, authorized, router]);

  // Sincroniza con el hash para deep links y botones atrás/adelante
  // (#integrantes / #admins / #auditoria; #logs legacy = auditoría)
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      setActiveTab(
        h === "#admins" ? "admins" : h === "#auditoria" || h === "#logs" ? "auditoria" : "integrantes"
      );
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function handleTab(t: AdminTab) {
    setActiveTab(t);
    window.scrollTo({ top: 0 });
  }

  // Solo la verificación inicial muestra carga; al navegar con el rol ya
  // verificado el panel renderiza inmediatamente. Nada sensible sin rol.
  if (!authorized) {
    return <p className="py-10 text-center text-zinc-500">Verificando acceso…</p>;
  }

  return (
    <div className="-mx-4 -my-6">
      <AdminSidebar activeTab={activeTab} onTabChange={handleTab} />
      <div className="max-w-5xl space-y-4 p-4 md:py-6 md:pl-[272px] md:pr-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">{HEADERS[activeTab].title}</h1>
            <p className="text-sm text-zinc-400">{HEADERS[activeTab].sub}</p>
          </div>
          <ReloadButton />
        </div>

        {activeTab === "integrantes" && (
          <>
            <AdminStats refreshKey={statsKey} />
            <TopPaises refreshKey={statsKey} />
            <MemberManagementTable onChanged={() => setStatsKey((k) => k + 1)} />
          </>
        )}

        {activeTab === "admins" && (
          <>
            <SuperAdminStats refreshKey={statsKey} />
            <section id="admins" className="scroll-mt-20">
              <ManageAdmins />
            </section>
          </>
        )}

        {activeTab === "auditoria" && (
          <>
            <SuperAdminStats refreshKey={statsKey} />
            <section id="auditoria" className="scroll-mt-20">
              <AdminLogs />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
