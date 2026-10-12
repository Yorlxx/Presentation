"use client";

import { useEffect, useState } from "react";
import { Clock, Globe, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Stats = { total: number; countries: number; recent: number };

export default function AdminStats({ refreshKey = 0 }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats>({ total: 0, countries: 0, recent: 0 });
  const [loading, setLoading] = useState(true);

  // Se recalcula al montar y cada vez que el padre bumpée refreshKey
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("presentaciones")
        .select("pais, created_at");
      const rows = (data ?? []) as { pais: string | null; created_at: string }[];
      const countries = new Set(
        rows.map((r) => (r.pais ?? "").trim().toLowerCase()).filter(Boolean)
      );
      const dayAgo = Date.now() - 24 * 3600 * 1000;
      const recent = rows.filter(
        (r) => new Date(r.created_at).getTime() >= dayAgo
      ).length;
      setStats({ total: rows.length, countries: countries.size, recent });
      setLoading(false);
    })();
  }, [refreshKey]);

  const cards = [
    { label: "Total Integrantes", value: stats.total, icon: Users },
    { label: "Países Representados", value: stats.countries, icon: Globe },
    { label: "Registros Recientes (24h)", value: stats.recent, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Icon className="h-5 w-5 text-emerald-400" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-none">
              {loading ? "…" : value}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
