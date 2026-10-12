"use client";

import { usePathname } from "next/navigation";

/** Pie minimalista público. Oculto en paneles admin (estilo dashboard limpio). */
export default function Footer() {
  const pathname = usePathname() ?? "";
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-zinc-800 py-6 text-center">
      <p className="text-xs text-zinc-500">
        © 2026 Presentaciones WA. Todos los derechos reservados.
      </p>
    </footer>
  );
}
