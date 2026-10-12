import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🎭 Presentaciones <span className="text-emerald-400">WA</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            Galería
          </Link>
          <Link
            href="/presentarme"
            className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            + Presentarme
          </Link>
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800 sm:block"
          >
            Admin
          </Link>
        </div>
      </nav>
    </header>
  );
}
