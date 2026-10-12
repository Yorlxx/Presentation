import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-6xl">🕳️</p>
      <h1 className="mt-4 text-3xl font-extrabold">404 — No encontrado</h1>
      <p className="mt-2 text-zinc-400">
        Esta presentación no existe o fue eliminada por un administrador.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-400"
      >
        Volver a la galería
      </Link>
    </div>
  );
}
