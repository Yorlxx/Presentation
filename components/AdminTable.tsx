"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logAdminActivity, getMyRole } from "@/lib/admin";
import type { Presentacion } from "@/lib/types";

export default function AdminTable({ allowDelete = true }: { allowDelete?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Presentacion[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Presentacion | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("presentaciones")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setItems((data ?? []) as Presentacion[]);
  }

  useEffect(() => {
    (async () => {
      const role = await getMyRole();
      if (!role) {
        router.push("/login");
        return;
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((m) =>
      [m.nombre, m.pais, m.whatsapp_user].join(" ").toLowerCase().includes(s)
    );
  }, [items, q]);

  async function saveEdit() {
    if (!editing) return;
    const { id, created_at, ...payload } = editing as Presentacion & Record<string, unknown>;
    void created_at;
    const { error } = await supabase
      .from("presentaciones")
      .update(payload)
      .eq("id", editing.id);
    if (error) setMsg(error.message);
    else {
      setMsg("✅ Actualizado");
      await logAdminActivity("UPDATE", { id: editing.id, nombre: editing.nombre });
      setEditing(null);
      await load();
    }
  }

  async function remove(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la presentación de ${nombre}?`)) return;
    const { error } = await supabase.from("presentaciones").delete().eq("id", id);
    if (error) setMsg(error.message);
    else {
      await logAdminActivity("DELETE", { id, nombre });
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, país o WhatsApp…"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
      />
      {msg && <p className="text-sm text-zinc-300">{msg}</p>}

      {/* Tabla responsive: cards en móvil, tabla en desktop */}
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">País</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Creado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-zinc-900/60">
                <td className="p-3 font-semibold">{m.nombre}</td>
                <td className="p-3">{m.pais ?? "—"}</td>
                <td className="p-3 text-emerald-400">{m.whatsapp_user ?? "—"}</td>
                <td className="p-3 text-zinc-500">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="space-x-2 p-3 text-right">
                  <button
                    onClick={() => setEditing(m)}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700"
                  >
                    Editar
                  </button>
                  {allowDelete && (
                    <button
                      onClick={() => remove(m.id, m.nombre)}
                      className="rounded-lg bg-red-900 px-3 py-1.5 hover:bg-red-800"
                    >
                      Borrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-bold">{m.nombre}</p>
            <p className="text-sm text-zinc-400">
              {m.pais ?? "—"} · {m.whatsapp_user ?? "—"}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setEditing(m)}
                className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm"
              >
                Editar
              </button>
              {allowDelete && (
                <button
                  onClick={() => remove(m.id, m.nombre)}
                  className="flex-1 rounded-lg bg-red-900 px-3 py-2 text-sm"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5">
            <h3 className="mb-3 text-lg font-bold">Editar: {editing.nombre}</h3>
            <div className="grid gap-2">
              {(["nombre", "pais", "genero", "whatsapp_user", "anime_favorito", "color_favorito", "musica_favorita", "pasatiempos", "gustos", "disgustos", "personalidad", "dato_curioso"] as const).map(
                (k) => (
                  <label key={k} className="text-xs text-zinc-400">
                    {k}
                    <input
                      value={(editing[k] as string) ?? ""}
                      onChange={(e) =>
                        setEditing({ ...editing, [k]: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white"
                    />
                  </label>
                )
              )}
              <label className="text-xs text-zinc-400">
                edad
                <input
                  type="number"
                  value={editing.edad ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      edad: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={saveEdit}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 font-bold text-zinc-950"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-zinc-800 py-2.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
