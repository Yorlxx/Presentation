"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Pencil, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { logAdminActivity, isAprobado } from "@/lib/admin";
import { useSession } from "./SessionProvider";
import type { Presentacion } from "@/lib/types";
import EditMemberModal from "./EditMemberModal";
import ConfirmModal from "./ConfirmModal";
import CustomSelect from "./ui/CustomSelect";
import EmptyState from "./EmptyState";
import { CardsSkeleton, RowsSkeleton } from "./Skeleton";

const PAGE_SIZE = 10;

function Avatar({ m, size = "h-12 w-12" }: { m: Presentacion; size?: string }) {
  if (m.foto_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={m.foto_url}
        alt={`Foto de ${m.nombre}`}
        draggable={false}
        className={`${size} shrink-0 rounded-full border border-zinc-700 object-cover select-none pointer-events-none [-webkit-touch-callout:none]`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800`}
    >
      <User className="h-5 w-5 text-zinc-500" aria-hidden />
    </span>
  );
}

/**
 * Tabla de moderación reutilizable (idéntica en /admin y /super-admin).
 * Buscar + filtros + editar (modal grid 2 col) + aprobar + borrar +
 * acciones en lote + paginación + exportar CSV.
 */
export function StatusBadge({ aprobado }: { aprobado: boolean }) {
  return aprobado ? (
    <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
      Aprobado
    </span>
  ) : (
    <span className="inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400">
      Pendiente
    </span>
  );
}

function toCSV(rows: Presentacion[]): string {
  const cols = [
    "nombre", "edad", "pais", "genero", "whatsapp_user", "anime_favorito",
    "color_favorito", "musica_favorita", "pasatiempos", "gustos", "disgustos",
    "personalidad", "dato_curioso", "aprobado", "created_at",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(","));
  }
  return "﻿" + lines.join("\r\n");
}

export default function MemberManagementTable({
  allowDelete = true,
  onChanged,
}: {
  allowDelete?: boolean;
  /** Se invoca tras cada mutación para que el padre refresque KPIs y Top Países */
  onChanged?: () => void;
}) {
  const router = useRouter();
  // Defensa en profundidad desde memoria (la página ya verificó el rol).
  const { role, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<Presentacion[]>([]);
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [paisFilter, setPaisFilter] = useState("Todos los países");
  const [editing, setEditing] = useState<Presentacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Presentacion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("presentaciones")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      setItems((data ?? []) as Presentacion[]);
      setSelectedIds([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, role]);

  // Reset de página al cambiar búsqueda o filtros
  useEffect(() => {
    setPage(1);
  }, [q, estadoFilter, paisFilter]);

  const paisesUnicos = useMemo(() => {
    const set = new Set(
      items.map((i) => (i.pais ?? "").trim()).filter(Boolean)
    );
    return ["Todos los países", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((m) => {
      if (s && ![m.nombre, m.pais, m.whatsapp_user].join(" ").toLowerCase().includes(s)) {
        return false;
      }
      if (estadoFilter === "Aprobados" && !isAprobado(m)) return false;
      if (estadoFilter === "Pendientes" && isAprobado(m)) return false;
      if (paisFilter !== "Todos los países" && (m.pais ?? "").trim() !== paisFilter) {
        return false;
      }
      return true;
    });
  }, [items, q, estadoFilter, paisFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageIds = pageItems.map((m) => m.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  // La aprobación en lote solo tiene sentido si hay al menos un pendiente
  const somePendingSelected = selectedIds.some((id) => {
    const m = items.find((i) => i.id === id);
    return m ? !isAprobado(m) : false;
  });

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function togglePage() {
    setSelectedIds((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds]))
    );
  }

  function exportCSV() {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `integrantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado (${filtered.length} fichas)`);
  }

  async function saveEdit(draft: Presentacion) {
    setSaving(true);
    setSaveError("");
    const { id, created_at, ...payload } = draft as Presentacion &
      Record<string, unknown>;
    void created_at;
    const { error } = await supabase
      .from("presentaciones")
      .update(payload)
      .eq("id", draft.id);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setMsg("Actualizado");
    await logAdminActivity("UPDATE", { id: draft.id, nombre: draft.nombre });
    setEditing(null);
    await load();
    onChanged?.();
    void id;
  }

  async function approve(m: Presentacion) {
    const { id, nombre } = m;
    const { error } = await supabase
      .from("presentaciones")
      .update({ aprobado: true })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAdminActivity("APPROVE", { id, nombre });
    toast.success("Ficha aprobada correctamente");
    await load();
    onChanged?.();
  }

  async function apiDelete(ids: string[]): Promise<{ failedPhotos: number }> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
    const res = await fetch("/api/admin/delete-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "Error al eliminar");
    return { failedPhotos: json?.failedPhotos ?? 0 };
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { failedPhotos } = await apiDelete([pendingDelete.id]);
      setPendingDelete(null);
      if (failedPhotos > 0) {
        toast.warning("Ficha eliminada, pero la foto sigue en Storage");
      } else {
        toast.success("Ficha eliminada correctamente");
      }
      await load();
      onChanged?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  async function bulkApprove() {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const { error } = await supabase
      .from("presentaciones")
      .update({ aprobado: true })
      .in("id", selectedIds);
    setBulkBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAdminActivity("BULK_APPROVE", { count: selectedIds.length });
    toast.success(`${selectedIds.length} fichas aprobadas`);
    await load();
    onChanged?.();
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setBulkBusy(true);
    try {
      const { failedPhotos } = await apiDelete(selectedIds);
      setPendingBulkDelete(false);
      if (failedPhotos > 0) {
        toast.warning(
          `Fichas eliminadas, pero ${failedPhotos} foto(s) siguen en Storage`
        );
      } else {
        toast.success(`${count} fichas eliminadas`);
      }
      await load();
      onChanged?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Buscador + exportar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, país o WhatsApp…"
          className="w-full flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={exportCSV}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-4 text-sm font-semibold hover:bg-zinc-700"
        >
          <Download className="h-4 w-4" aria-hidden />
          Exportar CSV
        </button>
      </div>

      {/* Filtros combinados */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CustomSelect
          value={estadoFilter}
          onChange={setEstadoFilter}
          options={["Todos", "Aprobados", "Pendientes"]}
          ariaLabel="Filtrar por estado"
        />
        <CustomSelect
          value={paisFilter}
          onChange={setPaisFilter}
          options={paisesUnicos}
          ariaLabel="Filtrar por país"
        />
      </div>
      {msg && <p className="text-sm text-zinc-300">{msg}</p>}

      {loading ? (
        <>
          <RowsSkeleton />
          <CardsSkeleton />
        </>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
      {/* Desktop: tabla limpia */}
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={togglePage}
                  aria-label="Seleccionar página"
                  className="h-5 w-5 cursor-pointer accent-emerald-500"
                />
              </th>
              <th className="p-3">Integrante</th>
              <th className="p-3">Estado</th>
              <th className="p-3">País</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Creado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {pageItems.map((m) => (
              <tr key={m.id} className="hover:bg-zinc-900/60">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleOne(m.id)}
                    aria-label={`Seleccionar a ${m.nombre}`}
                    className="h-5 w-5 cursor-pointer accent-emerald-500"
                  />
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar m={m} size="h-9 w-9" />
                    <span className="font-semibold">{m.nombre}</span>
                  </span>
                </td>
                <td className="p-3">
                  <StatusBadge aprobado={isAprobado(m)} />
                </td>
                <td className="p-3">{m.pais ?? "—"}</td>
                <td className="p-3 text-emerald-400">{m.whatsapp_user ?? "—"}</td>
                <td className="p-3 text-zinc-500">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="space-x-2 whitespace-nowrap p-3 text-right">
                  {!isAprobado(m) && (
                    <button
                      onClick={() => approve(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 hover:bg-emerald-500"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Aprobar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSaveError("");
                      setEditing(m);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Editar
                  </button>
                  {allowDelete && (
                    <button
                      onClick={() => setPendingDelete(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-900 px-3 py-1.5 hover:bg-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Borrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: cada fila es una card independiente */}
      <div className="grid gap-3 md:hidden">
        {pageItems.map((m) => (
          <div key={m.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={() => toggleOne(m.id)}
                aria-label={`Seleccionar a ${m.nombre}`}
                className="h-5 w-5 shrink-0 cursor-pointer accent-emerald-500"
              />
              <Avatar m={m} />
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {m.nombre}
                  {m.edad != null && (
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">
                      {m.edad} años
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-zinc-400">
                  {m.pais ?? "—"} · {m.whatsapp_user ?? "sin WA"}
                </p>
                <div className="mt-1">
                  <StatusBadge aprobado={isAprobado(m)} />
                </div>
              </div>
            </div>
            {!isAprobado(m) && (
              <button
                onClick={() => approve(m)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold active:bg-emerald-500"
              >
                <Check className="h-4 w-4" aria-hidden />
                Aprobar ficha
              </button>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSaveError("");
                  setEditing(m);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2.5 text-sm font-semibold active:bg-zinc-700"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </button>
              {allowDelete && (
                <button
                  onClick={() => setPendingDelete(m)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-red-900 px-3 py-2.5 text-sm font-semibold active:bg-red-800"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Borrar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm">
        <span className="text-zinc-400">
          Página {safePage} de {totalPages} · {filtered.length} fichas
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="min-h-[44px] rounded-xl bg-zinc-800 px-4 font-semibold hover:bg-zinc-700 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="min-h-[44px] rounded-xl bg-zinc-800 px-4 font-semibold hover:bg-zinc-700 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
        </>
      )}

      {/* Barra flotante de acciones en lote */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur md:ml-32">
          <span className="whitespace-nowrap px-2 text-sm font-semibold">
            {selectedIds.length} sel.
          </span>
          {somePendingSelected && (
            <button
              onClick={bulkApprove}
              disabled={bulkBusy}
              className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-4 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" aria-hidden />
              Aprobar
            </button>
          )}
          {allowDelete && (
            <button
              onClick={() => setPendingBulkDelete(true)}
              disabled={bulkBusy}
              className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-700 px-4 text-sm font-bold hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Eliminar
            </button>
          )}
          <button
            onClick={() => setSelectedIds([])}
            aria-label="Limpiar selección"
            className="flex min-h-[44px] items-center rounded-xl px-2 text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}

      {editing && (
        <EditMemberModal
          member={editing}
          saving={saving}
          error={saveError}
          onClose={() => {
            if (!saving) {
              setEditing(null);
              setSaveError("");
            }
          }}
          onSave={saveEdit}
        />
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        title="Eliminar ficha"
        message={
          pendingDelete
            ? `¿Eliminar la presentación de ${pendingDelete.nombre}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        tone="danger"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={pendingBulkDelete}
        title="Eliminar fichas"
        message={`¿Eliminar ${selectedIds.length} fichas seleccionadas? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        tone="danger"
        busy={bulkBusy}
        onCancel={() => {
          if (!bulkBusy) setPendingBulkDelete(false);
        }}
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}
