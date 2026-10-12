"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Contact, Crown, LogOut, User, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./SessionProvider";
import { readMyPresentationId } from "@/lib/miFicha";

/** Rutas públicas: jamás muestran controles administrativos. */
const PUBLIC_ROUTES = ["/", "/presentarme"];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  // Rol leído del contexto global en memoria (sin consultas por render)
  const { role, loading } = useSession();
  // Ficha propia del dispositivo (se re-lee al cambiar de ruta; la
  // verificación contra la BD la hace la galería al cargar)
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMyId(readMyPresentationId());
  }, [pathname]);

  // El dashboard admin usa su propio sidebar: no duplicar navegación.
  if ((pathname ?? "").startsWith("/admin") || (pathname ?? "").startsWith("/super-admin")) {
    return null;
  }

  // Rutas desconocidas (404): cabecera minimalista solo con el logo,
  // sin enlaces de navegación, administración ni sesión.
  const p = pathname ?? "";
  const isKnownRoute =
    p === "/" ||
    p === "/presentarme" ||
    p === "/login" ||
    p.startsWith("/perfil/");
  if (!isKnownRoute) {
    return (
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Contact className="h-5 w-5 text-emerald-400" aria-hidden />
            Presentaciones <span className="text-emerald-400">WA</span>
          </Link>
        </nav>
      </header>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Aislamiento: en rutas públicas NUNCA se renderizan controles
  // administrativos, aunque haya sesión activa.
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname ?? "");
  const showAdminControls = !loading && !isPublicRoute && role !== null;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Contact className="h-5 w-5 text-emerald-400" aria-hidden />
          Presentaciones <span className="text-emerald-400">WA</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            Galería
          </Link>
          {myId ? (
            <Link
              href={`/perfil/${myId}`}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              <User className="h-4 w-4" aria-hidden />
              Mi Ficha
            </Link>
          ) : (
            <Link
              href="/presentarme"
              className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              + Presentarme
            </Link>
          )}
          {/* Controles de gestión SOLO fuera de rutas públicas y con rol confirmado */}
          {showAdminControls && role === "admin" && (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 font-semibold text-zinc-100 hover:bg-zinc-700"
              >
                <Wrench className="h-4 w-4" aria-hidden />
                Panel Admin
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Cerrar Sesión
              </button>
            </>
          )}
          {showAdminControls && role === "super_admin" && (
            <>
              <Link
                href="/super-admin"
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-400"
              >
                <Crown className="h-4 w-4" aria-hidden />
                Super Admin
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Cerrar Sesión
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
