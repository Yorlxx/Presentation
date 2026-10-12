"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/** Top 5 países con más integrantes (barras de progreso) */
export default function TopPaises({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<{ pais: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Se recalcula al montar y cada vez que el padre bumpée refreshKey
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("presentaciones").select("pais");
      const map = new Map<string, number>();
      for (const r of (data ?? []) as { pais: string | null }[]) {
        const p = (r.pais ?? "").trim();
        if (!p) continue;
        map.set(p, (map.get(p) ?? 0) + 1);
      }
      setRows(
        [...Array.from(map.entries())]
          .map(([pais, count]) => ({ pais, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
      setLoading(false);
    })();
  }, [refreshKey]);

  const max = rows[0]?.count ?? 1;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <BarChart3 className="h-4 w-4 text-emerald-400" aria-hidden />
        Top Países
      </h3>
      {loading ? (
        <div className="space-y-2.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin datos todavía.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ pais, count }) => (
            <div key={pais}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{pais}</span>
                <span className="text-zinc-400">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
