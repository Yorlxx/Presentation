/** Skeletons con pulso para la carga inicial de la tabla de moderación */

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="hidden overflow-hidden rounded-2xl border border-zinc-800 md:block"
      aria-hidden
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 border-b border-zinc-800 p-3 last:border-0"
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-800" />
          <div className="h-4 flex-1 rounded bg-zinc-800" />
          <div className="h-4 w-16 rounded bg-zinc-800" />
          <div className="h-8 w-24 rounded-lg bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-zinc-800" />
            <div className="h-10 rounded-xl bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
