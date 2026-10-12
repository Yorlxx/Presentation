"use client";

import { useState } from "react";
import { Eye, User } from "lucide-react";

type Props = {
  revealed: boolean;
  onToggle: () => void;
  src: string | null;
  alt: string;
  className?: string;
};

/**
 * Imagen protegida:
 * - select-none + pointer-events-none + touch-callout none
 * - overlay transparente que bloquea clic derecho / long-press
 * - blur-xl por defecto, blur-0 al revelar con tap/clic
 */
export default function ProtectedImage({
  revealed,
  onToggle,
  src,
  alt,
  className = "",
}: Props) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onContextMenu={(e) => {
        e.preventDefault();
        setBlocked(true);
        setTimeout(() => setBlocked(false), 1200);
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className={`h-full w-full object-cover select-none pointer-events-none transition-all duration-500 [-webkit-touch-callout:none] ${
            revealed ? "blur-0 scale-100" : "blur-xl scale-110"
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-800 select-none">
          <User className="h-12 w-12 text-zinc-600" aria-hidden />
        </div>
      )}

      {/* Capa overlay anti-descarga / anti long-press */}
      <div
        role="button"
        aria-label={revealed ? "Ocultar foto" : "Revelar foto"}
        title={revealed ? "Clic para ocultar" : "Clic para revelar"}
        onClick={onToggle}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 z-10 cursor-pointer bg-transparent [-webkit-touch-callout:none]"
      />

      {!revealed && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Toca para revelar
          </span>
        </div>
      )}
      {blocked && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-auto w-fit rounded bg-red-600/90 px-3 py-1 text-xs font-bold">
          Descarga deshabilitada
        </div>
      )}
    </div>
  );
}
