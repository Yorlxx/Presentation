"use client";

import { useState } from "react";
import Link from "next/link";
import { Clapperboard, Gamepad2 } from "lucide-react";
import type { Presentacion } from "@/lib/types";
import ProtectedImage from "./ProtectedImage";

export default function MemberCard({ m }: { m: Presentacion }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-lg transition hover:border-zinc-700">
      <ProtectedImage
        revealed={revealed}
        onToggle={() => setRevealed((v) => !v)}
        src={m.foto_url}
        alt={`Foto de ${m.nombre}`}
        className="aspect-[4/3] w-full"
      />
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold leading-tight">{m.nombre}</h3>
          {m.edad != null && (
            <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
              {m.edad} años
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400">
          {[m.pais, m.genero].filter(Boolean).join(" · ") || "—"}
        </p>
        <p className="truncate text-sm text-emerald-400">
          {m.whatsapp_user || "sin WA"}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-zinc-300">
          <Gamepad2 className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <span className="line-clamp-2">
            {m.pasatiempos || "—"} · {m.anime_favorito || "—"}
          </span>
          <Clapperboard className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        </p>
        <Link
          href={`/perfil/${m.id}`}
          className="mt-2 block rounded-xl bg-zinc-100 px-4 py-2.5 text-center text-sm font-bold text-zinc-900 hover:bg-white"
        >
          Ver Ficha Completa
        </Link>
      </div>
    </article>
  );
}
