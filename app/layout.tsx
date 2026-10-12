import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Presentaciones WA — Galería del grupo",
  description:
    "Almacena y muestra las presentaciones de los miembros del grupo de WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body>
        <Navbar />
        <main className="mx-auto min-h-[calc(100vh-57px)] max-w-7xl px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
          Hecho con Next.js + Supabase · Las fotos están protegidas contra
          descarga
        </footer>
      </body>
    </html>
  );
}
