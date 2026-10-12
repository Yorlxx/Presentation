"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Presentacion } from "@/lib/types";
import MemberCard from "@/components/MemberCard";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  const [items, setItems] = useState<Presentacion[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("presentaciones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setItems((data ?? []) as Presentacion[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((m) =>
      [m.nombre, m.pais, m.pasatiempos, m.anime_favorito]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [items, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Galería de integrantes
          </h1>
          <p className="text-sm text-zinc-400">
            {filtered.length} presentaciones · toca la foto para revelarla
          </p>
        </div>
      </div>

      <SearchBar value={q} onChange={setQ} />

      {loading && (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
          Cargando presentaciones…
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          Error: {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
          Sin resultados.{" "}
          <a href="/presentarme" className="text-emerald-400 underline">
            Sé el primero en presentarte
          </a>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((m) => (
          <MemberCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}
