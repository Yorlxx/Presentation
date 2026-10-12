"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contact, Plus, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { clearMyPresentationId, syncMyPresentationId } from "@/lib/miFicha";
import ReloadButton from "@/components/ReloadButton";
import { toast } from "sonner";

const PAGE_SIZE = 12;
import type { Presentacion } from "@/lib/types";
import MemberCard from "@/components/MemberCard";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  const [items, setItems] = useState<Presentacion[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [page, setPage] = useState(0); // bloques de 12 ya cargados
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchBlock(from: number, to: number): Promise<Presentacion[]> {
    let { data, error } = await supabase
      .from("presentaciones")
      .select("*")
      .eq("aprobado", true)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error && /aprobado|schema cache/i.test(error.message)) {
      // Columna aún no migrada: degradar a lectura total
      const retry = await supabase
        .from("presentaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      data = retry.data;
      error = retry.error;
    }
    if (error) throw new Error(error.message);
    return (data ?? []) as Presentacion[];
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchBlock(0, PAGE_SIZE - 1);
        setItems(rows);
        setPage(1);
        setHasMore(rows.length === PAGE_SIZE);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      }
      setLoading(false);

      // Reconocimiento persistente: sincronizar capas y verificar en silencio
      // vía /api/mi-ficha (service_role: ve fichas pendientes; un select
      // anónimo las ocultaría por RLS y borraría la memoria por error)
      const stored = syncMyPresentationId();
      if (stored) {
        const res = await fetch(`/api/mi-ficha?id=${encodeURIComponent(stored)}`);
        if (res.ok) setMyId(stored);
        // 404 = borrada de verdad → limpiar; otro error = conservar sin verificar
        else if (res.status === 404) clearMyPresentationId();
      }
    })();
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const from = page * PAGE_SIZE;
      const rows = await fetchBlock(from, from + PAGE_SIZE - 1);
      setItems((prev) => [...prev, ...rows]);
      setPage((p) => p + 1);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      toast.error("No se pudieron cargar más tarjetas");
    } finally {
      setLoadingMore(false);
    }
  }

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
      {/* Header simple: logo, buscador centralizado y CTA destacado */}
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 text-center">
        <div className="flex w-full items-center justify-center gap-2">
          <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Contact className="h-6 w-6 text-emerald-400" aria-hidden />
            Galería del grupo
          </span>
          <ReloadButton label="" className="px-2.5" />
        </div>
        <p className="text-sm text-zinc-400">
          {filtered.length} presentaciones · toca la foto para revelarla
        </p>
        <div className="w-full">
          <SearchBar value={q} onChange={setQ} />
        </div>
        {myId && (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-2.5 text-sm text-emerald-200">
            Bienvenido de nuevo.
            <Link href={`/perfil/${myId}`} className="font-bold underline hover:text-white">
              Ver mi tarjeta
            </Link>
          </div>
        )}
        {myId ? (
          <Link
            href={`/perfil/${myId}`}
            className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-3 text-base font-bold text-zinc-950 hover:bg-emerald-400"
          >
            <User className="h-5 w-5" aria-hidden />
            Mi Ficha
          </Link>
        ) : (
          <Link
            href="/presentarme"
            className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-3 text-base font-bold text-zinc-950 hover:bg-emerald-400"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Presentarme
          </Link>
        )}
      </div>

      {loading && (
        <p className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
          Cargando presentaciones…
        </p>
      )}
      {error && (
        <p className="mx-auto max-w-xl rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">
          Error: {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
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

      {!loading && !error && hasMore && filtered.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="min-h-[52px] rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-3 text-base font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loadingMore ? "Cargando…" : "Cargar más tarjetas"}
          </button>
        </div>
      )}
    </div>
  );
}
