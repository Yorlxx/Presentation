"use client";

import { RotateCw } from "lucide-react";

/** Recarga completa de la página (datos frescos desde Supabase) */
export default function ReloadButton({
  className = "",
  label = "Recargar",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      title="Recargar la página"
      className={`flex min-h-[44px] items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 ${className}`}
    >
      <RotateCw className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
