"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { EDADES, GENEROS, PAISES } from "@/lib/options";
import CustomSelect from "./ui/CustomSelect";
import type { Presentacion } from "@/lib/types";

type Props = {
  member: Presentacion;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (draft: Presentacion) => void;
};

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-xs font-semibold text-zinc-400 ${className}`}>
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default function EditMemberModal({
  member,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<Presentacion>(member);

  function set<K extends keyof Presentacion>(key: K, value: Presentacion[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function text<K extends keyof Presentacion>(
    key: K,
    placeholder?: string
  ): string {
    const v = draft[key];
    return typeof v === "string" ? v : "";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Editar a ${member.nombre}`}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl shadow-black/60 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-4 w-4 text-emerald-400" aria-hidden />
            Editar: <span className="text-emerald-400">{member.nombre}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Cuerpo con scroll propio */}
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input
              value={text("nombre")}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Nombre"
              className={inputCls}
            />
          </Field>
          <Field label="Edad">
            <CustomSelect
              value={draft.edad != null ? String(draft.edad) : ""}
              onChange={(v) =>
                set("edad", v ? parseInt(v, 10) : null)
              }
              options={EDADES}
              placeholder="Selecciona edad..."
              ariaLabel="Edad"
            />
          </Field>
          <Field label="País">
            <CustomSelect
              value={text("pais")}
              onChange={(v) => set("pais", v)}
              options={PAISES}
              placeholder="Selecciona tu país..."
              ariaLabel="País"
            />
          </Field>
          <Field label="Género">
            <CustomSelect
              value={text("genero")}
              onChange={(v) => set("genero", v)}
              options={GENEROS}
              placeholder="Selecciona género..."
              ariaLabel="Género"
            />
          </Field>
          <Field label="WhatsApp (número o @usuario)" className="sm:col-span-2">
            <input
              value={text("whatsapp_user")}
              onChange={(e) => set("whatsapp_user", e.target.value)}
              placeholder="@usuario o +52…"
              className={inputCls}
            />
          </Field>
          <Field label="Anime favorito">
            <input
              value={text("anime_favorito")}
              onChange={(e) => set("anime_favorito", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Color favorito">
            <input
              value={text("color_favorito")}
              onChange={(e) => set("color_favorito", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Música favorita" className="sm:col-span-2">
            <input
              value={text("musica_favorita")}
              onChange={(e) => set("musica_favorita", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Pasatiempos" className="sm:col-span-2">
            <input
              value={text("pasatiempos")}
              onChange={(e) => set("pasatiempos", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Gustos" className="sm:col-span-2">
            <input
              value={text("gustos")}
              onChange={(e) => set("gustos", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Disgustos" className="sm:col-span-2">
            <input
              value={text("disgustos")}
              onChange={(e) => set("disgustos", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Personalidad" className="sm:col-span-2">
            <input
              value={text("personalidad")}
              onChange={(e) => set("personalidad", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Dato curioso" className="sm:col-span-2">
            <input
              value={text("dato_curioso")}
              onChange={(e) => set("dato_curioso", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Footer fijo */}
        <div className="shrink-0 border-t border-zinc-800 px-5 py-4">
          {error && (
            <p className="mb-3 rounded-xl border border-red-900 bg-red-950 p-2.5 text-xs text-red-300">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
