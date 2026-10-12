"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Copy,
  ImagePlus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, FOTOS_BUCKET } from "@/lib/supabaseClient";
import { EDADES, GENEROS, PAISES } from "@/lib/options";
import CustomSelect from "@/components/ui/CustomSelect";
import ReloadButton from "@/components/ReloadButton";
import { compressToWebp, buildWebpFileName, isHeicFile, HEIC_MSG } from "@/lib/image";
import {
  buildPresentationMessage,
  whatsappShareUrl,
  copyToClipboard,
} from "@/lib/whatsapp";
import { saveMyPresentationId, readMyPresentationId } from "@/lib/miFicha";
import { deleteMemberPhoto } from "@/lib/admin";
import type { Presentacion } from "@/lib/types";

type FieldDef = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  kind?: "text" | "select";
  options?: (string | number)[];
};

const FIELDS: FieldDef[] = [
  { key: "nombre", label: "Nombre", required: true, placeholder: "Tu nombre" },
  { key: "edad", label: "Edad", kind: "select", options: EDADES, placeholder: "Selecciona edad..." },
  { key: "pais", label: "País", kind: "select", options: PAISES, placeholder: "Selecciona tu país..." },
  { key: "genero", label: "Género", kind: "select", options: GENEROS, placeholder: "Selecciona género..." },
  { key: "whatsapp_user", label: "WhatsApp (número o @usuario)", placeholder: "@usuario o +52…" },
  { key: "anime_favorito", label: "Anime favorito", placeholder: "Ej. One Piece" },
  { key: "color_favorito", label: "Color favorito", placeholder: "Ej. Azul" },
  { key: "musica_favorita", label: "Música favorita", placeholder: "Ej. J-Pop" },
  { key: "pasatiempos", label: "Pasatiempos", placeholder: "Dibujar, gaming…" },
  { key: "gustos", label: "Gustos", placeholder: "Qué te gusta" },
  { key: "disgustos", label: "Disgustos", placeholder: "Qué no te gusta" },
  { key: "personalidad", label: "Personalidad", placeholder: "Ej. Tranquila y curiosa" },
  { key: "dato_curioso", label: "Dato curioso", placeholder: "Algo divertido sobre ti" },
];

const inputCls =
  "w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none";

export default function PresentarmePage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  // Modo edición (?edit=true): precarga la ficha propia del dispositivo
  const [editId, setEditId] = useState<string | null>(null);
  const [currentFoto, setCurrentFoto] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saved, setSaved] = useState<null | { message: string }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(key: string, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  // Si viene ?edit=true, precarga la ficha guardada en el dispositivo
  useEffect(() => {
    if (!window.location.search.includes("edit=true")) return;
    (async () => {
      setEditLoading(true);
      const id = readMyPresentationId();
      if (!id) {
        toast.error("No se encontró tu ficha en este dispositivo");
        router.replace("/presentarme");
        return;
      }
      const res = await fetch(`/api/mi-ficha?id=${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ficha) {
        toast.error(json?.error ?? "No se pudo cargar tu ficha");
        router.replace("/presentarme");
        return;
      }
      const r = json.ficha as Presentacion;
      setEditId(r.id);
      setCurrentFoto(r.foto_url);
      setForm({
        nombre: r.nombre ?? "",
        edad: r.edad != null ? String(r.edad) : "",
        pais: r.pais ?? "",
        genero: r.genero ?? "",
        whatsapp_user: r.whatsapp_user ?? "",
        anime_favorito: r.anime_favorito ?? "",
        color_favorito: r.color_favorito ?? "",
        musica_favorita: r.musica_favorita ?? "",
        pasatiempos: r.pasatiempos ?? "",
        gustos: r.gustos ?? "",
        disgustos: r.disgustos ?? "",
        personalidad: r.personalidad ?? "",
        dato_curioso: r.dato_curioso ?? "",
      });
      if (r.foto_url) setPreview(r.foto_url);
      setEditLoading(false);
    })();
  }, [router]);

  function pickFile(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    if (isHeicFile(f)) {
      toast.error(HEIC_MSG);
      return;
    }
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  function clearFile() {
    setFile(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setSaved(null);
    if (!form.nombre?.trim()) {
      setStatus("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    let stage = "validación de datos";
    try {
      // Antiduplicados: normaliza (trim + minúsculas) y busca coincidencia exacta
      const waNorm = (form.whatsapp_user ?? "").trim().toLowerCase();
      if (waNorm) {
        const pattern = waNorm.replace(/[\\%_]/g, (c) => `\\${c}`);
        let dupQuery = supabase
          .from("presentaciones")
          .select("id")
          .ilike("whatsapp_user", pattern);
        // En edición, excluir la propia ficha del chequeo
        if (editId) dupQuery = dupQuery.neq("id", editId);
        const { data: dup, error: dupErr } = await dupQuery.limit(1);
        if (dupErr) throw dupErr;
        if (dup && dup.length > 0) {
          toast.warning("Este número o usuario de WhatsApp ya tiene una tarjeta registrada.");
          return;
        }
      }

      stage = "compresión y subida de la foto";
      let foto_url: string | null = editId ? currentFoto : null;

      if (file) {
        // Defensa extra por si el archivo cambió tras la selección
        if (isHeicFile(file)) {
          toast.error(HEIC_MSG);
          return;
        }
        // 1. Procesar a .webp en el navegador (Canvas API, max 800px, q 0.8)
        const webp = await compressToWebp(file, 800, 0.8);
        const fileName = buildWebpFileName(form.nombre);
        // 2. Upload a Supabase Storage
        const { error: upErr } = await supabase.storage
          .from(FOTOS_BUCKET)
          .upload(fileName, webp, { contentType: "image/webp", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(fileName);
        foto_url = data.publicUrl;
        // 3. Si reemplazó foto en edición, borrar la anterior para no dejar basura
        if (editId && currentFoto && currentFoto !== foto_url) {
          await deleteMemberPhoto(currentFoto);
        }
      } else if (!preview) {
        foto_url = null;
      }

      stage = editId ? "actualización de la ficha" : "guardado de la ficha";
      const payload = {
        // Id generado en cliente: evita el .select() post-INSERT, cuyo
        // RETURNING exigiría permiso SELECT sobre la fila pendiente (42501)
        id: crypto.randomUUID(),
        nombre: form.nombre.trim(),
        edad: form.edad ? parseInt(form.edad, 10) : null,
        pais: form.pais || null,
        genero: form.genero || null,
        whatsapp_user: form.whatsapp_user || null,
        anime_favorito: form.anime_favorito || null,
        color_favorito: form.color_favorito || null,
        musica_favorita: form.musica_favorita || null,
        pasatiempos: form.pasatiempos || null,
        gustos: form.gustos || null,
        disgustos: form.disgustos || null,
        personalidad: form.personalidad || null,
        dato_curioso: form.dato_curioso || null,
        foto_url,
        aprobado: false,
      };

      // Modo edición: update (conserva el estado de aprobación) y volver al carnet
      if (editId) {
        const { aprobado: _ap, ...updatePayload } = payload;
        void _ap;
        const { error: upErr } = await supabase
          .from("presentaciones")
          .update(updatePayload)
          .eq("id", editId);
        if (upErr) throw upErr;
        toast.success("Tu ficha ha sido actualizada con éxito.");
        router.push(`/perfil/${editId}`);
        return;
      }

      const { error: insErr } = await supabase
        .from("presentaciones")
        .insert(payload);
      if (insErr) throw insErr;

      // Reconocimiento persistente de doble capa (localStorage + cookie 1 año)
      saveMyPresentationId(payload.id);

      setSaved({ message: buildPresentationMessage(payload) });
      toast.success("Presentación enviada. Quedó pendiente de aprobación");
      setStatus("");
    } catch (err: unknown) {
      // supabase-js lanza objetos planos (PostgrestError), no Error:
      // extraer message/details/hint/code de cualquier forma que venga
      let detail = "Error al guardar";
      if (err instanceof Error) {
        detail =
          [err.message, (err as { details?: unknown }).details]
            .filter(Boolean)
            .join(" · ") || detail;
      } else if (err && typeof err === "object") {
        const o = err as Record<string, unknown>;
        const parts = [o.message, o.details, o.hint, o.code].filter(
          (x): x is string => typeof x === "string" && x.length > 0
        );
        detail =
          parts.length > 0
            ? parts.join(" · ")
            : (() => {
                try {
                  return JSON.stringify(o);
                } catch {
                  return detail;
                }
              })();
      } else if (err != null) {
        detail = String(err);
      }
      console.error(`[presentarme] falló en etapa "${stage}":`, err);
      toast.error(`Error al guardar (${stage}): ${detail}`);
      setStatus(`Error en ${stage}: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  if (editLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
          Cargando tu ficha…
        </p>
      </div>
    );
  }

  if (saved) {
    const waUrl = whatsappShareUrl(saved.message);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden />
          <h1 className="mt-2 text-2xl font-extrabold">¡Presentación enviada!</h1>
          <p className="mt-1 text-sm text-emerald-200">
            Un administrador la revisará antes de publicarla en la galería
          </p>
        </div>
        <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
          {saved.message}
        </pre>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-center text-base font-bold text-zinc-950 hover:brightness-110"
          >
            <Send className="h-5 w-5" aria-hidden />
            Compartir en WhatsApp
          </a>
          <button
            onClick={async () => {
              await copyToClipboard(saved.message);
              toast.success("Texto copiado al portapapeles");
            }}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-base font-bold text-zinc-900 hover:bg-white"
          >
            <Copy className="h-5 w-5" aria-hidden />
            Copiar Texto
          </button>
        </div>
        <a href="/" className="block py-2 text-center text-sm text-zinc-400 underline">
          Volver a la galería
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {editId ? "Edita tu tarjeta de presentación" : "Crea tu tarjeta de presentación"}
          </h1>
          <p className="mb-5 mt-1 text-sm text-zinc-400">
            {editId
              ? "Actualiza tus datos y guarda los cambios."
              : "Completa tus datos, sube tu foto y compártela en el grupo."}
          </p>
        </div>
        <ReloadButton label="" className="px-3" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Uploader interactivo */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Foto de perfil</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {!preview ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 transition ${
                dragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-neutral-700 bg-neutral-900 hover:border-neutral-500"
              }`}
            >
              <ImagePlus className="h-9 w-9 text-zinc-500" aria-hidden />
              <span className="text-base font-semibold">
                Arrastra tu foto o toca para elegirla
              </span>
              <span className="text-xs text-zinc-500">
                Se comprime automáticamente a WebP (800px) en tu navegador
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Vista previa de tu foto"
                className="h-24 w-24 shrink-0 rounded-full border-2 border-emerald-500 object-cover"
                draggable={false}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                  <Camera className="h-4 w-4" aria-hidden />
                  Foto lista
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {file?.name} · se subirá como WebP
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 text-sm font-semibold hover:bg-zinc-700"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Quitar foto"
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 text-sm font-semibold hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulario en columna única en móvil */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div
              key={f.key}
              className={
                ["gustos", "disgustos", "personalidad", "dato_curioso", "pasatiempos", "whatsapp_user", "musica_favorita"].includes(f.key)
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <label className="mb-1.5 block text-sm font-semibold">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              {f.kind === "select" ? (
                <CustomSelect
                  value={form[f.key] || ""}
                  onChange={(v) => set(f.key, v)}
                  options={f.options ?? []}
                  placeholder={f.placeholder}
                  ariaLabel={f.label}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  value={form[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={!!f.required}
                  min={f.type === "number" ? 1 : undefined}
                  className={inputCls}
                />
              )}
            </div>
          ))}
        </div>

        {status && (
          <p className="rounded-xl border border-red-900 bg-red-950 p-3 text-sm text-red-300">
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-base font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          <Send className="h-5 w-5" aria-hidden />
          {saving ? "Guardando…" : editId ? "Guardar Cambios" : "Publicar y Compartir en WhatsApp"}
        </button>
      </form>
    </div>
  );
}
