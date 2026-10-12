import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <SearchX className="mx-auto h-16 w-16 text-zinc-600" aria-hidden />
      <h1 className="mt-4 text-3xl font-extrabold">404 — Página no encontrada</h1>
      <p className="mt-2 text-zinc-400">
        La ruta a la que intentas acceder no existe, cambio de dirección o fue removida.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-400"
      >
        Volver a la Galería
      </Link>
    </div>
  );
}
