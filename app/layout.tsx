import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionProvider from "@/components/SessionProvider";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";

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
        <SessionProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-57px)] max-w-7xl px-4 py-6">
            {children}
          </main>
        <Footer />
        <Toaster position="bottom-right" richColors theme="dark" />
        </SessionProvider>
      </body>
    </html>
  );
}
