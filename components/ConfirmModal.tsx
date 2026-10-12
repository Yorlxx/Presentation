"use client";

import { Check, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "success";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Modal confirmatorio reutilizable con estética oscura de la app */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  const isDanger = tone === "danger";
  const Icon = isDanger ? Trash2 : Check;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={() => !busy && onCancel()}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            isDanger ? "bg-red-500/15" : "bg-emerald-500/15"
          }`}
        >
          <Icon
            className={`h-6 w-6 ${isDanger ? "text-red-400" : "text-emerald-400"}`}
            aria-hidden
          />
        </span>
        <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
        <p className="mt-1.5 text-sm text-neutral-400">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="min-h-[48px] rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            }`}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
