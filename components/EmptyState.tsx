import { SearchX } from "lucide-react";

/** Estado vacío para búsquedas/filtros sin resultados */
export default function EmptyState({
  message = "No se encontraron integrantes que coincidan con los filtros",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-10 text-center">
      <SearchX className="h-10 w-10 text-zinc-600" aria-hidden />
      <p className="max-w-sm text-sm text-zinc-400">{message}</p>
    </div>
  );
}
