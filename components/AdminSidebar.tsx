"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Contact,
  History,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./SessionProvider";
import { displayUsername } from "@/lib/username";

export type AdminTab = "integrantes" | "admins" | "auditoria";

type SidebarProps = {
  /** Pestaña controlada (solo /super-admin). Sin ella, se usa el hash como respaldo. */
  activeTab?: AdminTab;
  onTabChange?: (t: AdminTab) => void;
};

export default function AdminSidebar({ activeTab, onTabChange }: SidebarProps = {}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  // Sesión y rol desde el contexto global (sin consultas por render)
  const { email, role } = useSession();
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const isSuper = role === "super_admin";
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const onSuperPanel = pathname.startsWith("/super-admin");

  // Respaldo para deep links: si no hay prop controlada, el hash decide el resaltado
  const hashTab: AdminTab =
    hash === "#admins" ? "admins" : hash === "#auditoria" || hash === "#logs" ? "auditoria" : "integrantes";
  const effectiveTab: AdminTab = activeTab ?? hashTab;

  function selectTab(t: AdminTab) {
    const h = t === "integrantes" ? "#integrantes" : t === "admins" ? "#admins" : "#auditoria";
    // Fuera del panel: navegar a /super-admin con el hash (la página lo lee al montar)
    if (!pathname.startsWith("/super-admin")) {
      setOpen(false);
      router.push(`/super-admin${h}`);
      return;
    }
    // Dentro del panel: cambio inmediato sin recarga ni scroll
    window.history.replaceState(null, "", h);
    setHash(h);
    setOpen(false);
    onTabChange?.(t);
  }

  const tabCls = (isActive: boolean) =>
    `flex w-full items-center gap-2.5 rounded-xl rounded-l-none px-3 py-2.5 text-sm transition ${
      isActive
        ? "border-l-2 border-emerald-500 bg-neutral-800 font-medium text-emerald-400"
        : "border-l-2 border-transparent text-neutral-400 hover:bg-neutral-800/60 hover:text-white"
    }`;

  function superNav() {
    const items = [
      { id: "integrantes" as AdminTab, label: "Gestión de Integrantes", icon: Users },
      { id: "admins" as AdminTab, label: "Administradores", icon: Shield },
      { id: "auditoria" as AdminTab, label: "Auditoría", icon: History },
    ];
    return (
      <nav className="space-y-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={tabCls(effectiveTab === id)}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    );
  }

  function nav(onNavigate?: () => void) {
    const isActive = pathname === "/admin";
    return (
      <nav className="space-y-1">
        <Link
          href="/admin"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-xl rounded-l-none px-3 py-2.5 text-sm transition ${
            isActive
              ? "border-l-2 border-emerald-500 bg-neutral-800 font-medium text-emerald-400"
              : "border-l-2 border-transparent text-neutral-400 hover:bg-neutral-800/60 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          Gestión de Integrantes
        </Link>
      </nav>
    );
  }

  function userBadge() {
    return (
      <div className="rounded-xl bg-neutral-800/80 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p
              className="truncate text-xs font-medium text-neutral-200"
              title={email || undefined}
            >
              {displayUsername(email) || "…"}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-700/60 px-2 py-0.5 text-[11px] font-semibold text-neutral-300">
              <Shield className="h-3 w-3" aria-hidden />
              {isSuper ? "Super Admin" : "Administrador"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: barra fija izquierda */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between border-r border-neutral-800 bg-neutral-900 p-4 md:flex">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2 px-1 text-base font-bold tracking-tight text-white">
            <Contact className="h-5 w-5 text-emerald-400" aria-hidden />
            Presentaciones <span className="text-emerald-400">WA</span>
          </Link>
          {userBadge()}
          {isSuper ? superNav() : nav()}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Cerrar Sesión
        </button>
      </aside>

      {/* Móvil: barra superior ligera + drawer */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-4 py-3 backdrop-blur md:hidden">
        <span className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
          <Contact className="h-5 w-5 text-emerald-400" aria-hidden />
          Presentaciones <span className="text-emerald-400">WA</span>
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-neutral-300 hover:bg-neutral-800 hover:text-white"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col justify-between bg-neutral-900 p-4 shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base font-bold text-white">
                <Contact className="h-5 w-5 text-emerald-400" aria-hidden />
                Presentaciones <span className="text-emerald-400">WA</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {userBadge()}
            {isSuper ? superNav() : nav(() => setOpen(false))}
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
}
