"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Pencil } from "lucide-react";
import {
  Brain,
  Cake,
  Clapperboard,
  Gamepad2,
  Globe,
  Heart,
  HeartCrack,
  IdCard,
  Lightbulb,
  MessageCircle,
  Music,
  Palette,
  PersonStanding,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Presentacion } from "@/lib/types";
import { isAprobado } from "@/lib/admin";
import ProtectedImage from "@/components/ProtectedImage";
import { clearMyPresentationId, readMyPresentationId } from "@/lib/miFicha";

/** Carnet de personaje — ficha individual completa */
export default function PerfilClient({ m }: { m: Presentacion }) {
  const [revealed, setRevealed] = useState(false);
  const [isMine, setIsMine] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMine(readMyPresentationId() === m.id);
  }, [m.id]);

  const rows: { icon: LucideIcon; label: string; value: string | number | null | undefined }[] = [
    { icon: User, label: "Nombre", value: m.nombre },
    { icon: Cake, label: "Edad", value: m.edad },
    { icon: Globe, label: "País", value: m.pais },
    { icon: PersonStanding, label: "Género", value: m.genero },
    { icon: MessageCircle, label: "WhatsApp", value: m.whatsapp_user },
    { icon: Clapperboard, label: "Anime favorito", value: m.anime_favorito },
    { icon: Palette, label: "Color favorito", value: m.color_favorito },
    { icon: Music, label: "Música favorita", value: m.musica_favorita },
    { icon: Gamepad2, label: "Pasatiempos", value: m.pasatiempos },
    { icon: Heart, label: "Gustos", value: m.gustos },
    { icon: HeartCrack, label: "Disgustos", value: m.disgustos },
    { icon: Brain, label: "Personalidad", value: m.personalidad },
    { icon: Lightbulb, label: "Dato curioso", value: m.dato_curioso },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">
        ← Volver a la galería
      </Link>
      {isMine && !isAprobado(m) && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <Clock className="h-5 w-5 shrink-0" aria-hidden />
          Tu presentación ha sido recibida y está en estado Pendiente (Esperando
          aprobación de un administrador).
        </div>
      )}
      <article className="mt-3 overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl">
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4">
          <IdCard className="h-6 w-6 text-zinc-950" aria-hidden />
          <h1 className="text-2xl font-extrabold text-zinc-950">
            Carnet de personaje
          </h1>
        </div>
        <ProtectedImage
          revealed={revealed}
          onToggle={() => setRevealed((v) => !v)}
          src={m.foto_url}
          alt={`Foto de ${m.nombre}`}
          className="aspect-[16/9] w-full"
        />
        <dl className="divide-y divide-zinc-800 p-2 sm:p-4">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="grid grid-cols-[160px_1fr] gap-2 px-3 py-2.5 text-sm sm:grid-cols-[200px_1fr]">
              <dt className="flex items-center gap-1.5 font-semibold text-zinc-400">
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </dt>
              <dd className="text-zinc-100">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </article>
      {isMine && (
        <button
          onClick={() => router.push("/presentarme?edit=true")}
          className="mx-auto mt-4 flex min-h-[48px] w-full max-w-2xl items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-base font-bold text-zinc-950 hover:bg-emerald-400"
        >
          <Pencil className="h-5 w-5" aria-hidden />
          Editar Mi Ficha
        </button>
      )}
      {isMine && (
        <button
          onClick={() => {
            clearMyPresentationId();
            router.push("/presentarme");
          }}
          className="mx-auto mt-4 block py-2 text-xs text-zinc-500 underline hover:text-zinc-300"
        >
          ¿No eres tú? Crear una nueva ficha
        </button>
      )}
    </div>
  );
}
