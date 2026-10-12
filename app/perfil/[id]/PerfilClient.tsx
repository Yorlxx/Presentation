"use client";

import { useState } from "react";
import Link from "next/link";
import type { Presentacion } from "@/lib/types";
import ProtectedImage from "@/components/ProtectedImage";

/** Carnet de personaje — ficha individual completa */
export default function PerfilClient({ m }: { m: Presentacion }) {
  const [revealed, setRevealed] = useState(false);

  const rows: [string, string | number | null | undefined][] = [
    ["👤 Nombre", m.nombre],
    ["🎂 Edad", m.edad],
    ["🌍 País", m.pais],
    ["⚧️ Género", m.genero],
    ["📱 WhatsApp", m.whatsapp_user],
    ["🎌 Anime favorito", m.anime_favorito],
    ["🎨 Color favorito", m.color_favorito],
    ["🎵 Música favorita", m.musica_favorita],
    ["🎯 Pasatiempos", m.pasatiempos],
    ["💖 Gustos", m.gustos],
    ["💔 Disgustos", m.disgustos],
    ["🧠 Personalidad", m.personalidad],
    ["🤯 Dato curioso", m.dato_curioso],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">
        ← Volver a la galería
      </Link>
      <article className="mt-3 overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4">
          <h1 className="text-2xl font-extrabold text-zinc-950">
            ⭐ Carnet de personaje
          </h1>
        </div>
        <ProtectedImage
          revealed={revealed}
          onToggle={() => setRevealed((v) => !v)}
          src={m.foto_url}
          alt={`Foto de ${m.nombre}`}
          className="aspect-[16/9] w-full"
        />
        <dl className="divide-y divide-zinc-800 p-2 sm:p-4">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[160px_1fr] gap-2 px-3 py-2.5 text-sm sm:grid-cols-[200px_1fr]">
              <dt className="font-semibold text-zinc-400">{k}</dt>
              <dd className="text-zinc-100">{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </article>
    </div>
  );
}
