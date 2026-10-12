"use client";

import { useState } from "react";
import { supabase, FOTOS_BUCKET } from "@/lib/supabaseClient";
import { compressToWebp, buildWebpFileName } from "@/lib/image";
import {
  buildPresentationMessage,
  whatsappShareUrl,
  copyToClipboard,
} from "@/lib/whatsapp";

const FIELDS: { key: string; label: string; type?: string; required?: boolean; placeholder?: string }[] = [
  { key: "nombre", label: "Nombre", required: true, placeholder: "Ej. Akira" },
  { key: "edad", label: "Edad", type: "number", placeholder: "Ej. 22" },
  { key: "pais", label: "País", placeholder: "Ej. México" },
  { key: "genero", label: "Género", placeholder: "Ej. Femenino / Masculino / Otro" },
  { key: "whatsapp_user", label: "WhatsApp (número o @usuario)", placeholder: "@akira o +52…" },
  { key: "anime_favorito", label: "Anime favorito", placeholder: "Ej. One Piece" },
  { key: "color_favorito", label: "Color favorito", placeholder: "Ej. Azul" },
  { key: "musica_favorita", label: "Música favorita", placeholder: "Ej. J-Pop" },
  { key: "pasatiempos", label: "Pasatiempos", placeholder: "Dibujar, gaming…" },
  { key: "gustos", label: "Gustos", placeholder: "Qué te gusta" },
  { key: "disgustos", label: "Disgustos", placeholder: "Qué no te gusta" },
  { key: "personalidad", label: "Personalidad", placeholder: "Ej. Tranquila y curiosa" },
  { key: "dato_curioso", label: "Dato curioso", placeholder: "Algo divertido sobre ti" },
];

export default function PresentarmePage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | { message: string }>(null);
  const [copied, setCopied] = useState(false);

  function set(key: string, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
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
    try {
      let foto_url: string | null = null;

      if (file) {
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
      }

      const payload = {
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
      };

      const { error: insErr } = await supabase.from("presentaciones").insert(payload);
      if (insErr) throw insErr;

      setSaved({ message: buildPresentationMessage(payload) });
      setStatus("");
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    const waUrl = whatsappShareUrl(saved.message);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950 p-6 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-2 text-2xl font-extrabold">¡Presentación guardada!</h1>
          <p className="mt-1 text-sm text-emerald-200">
            Ahora compártela en tu grupo de WhatsApp
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
            className="rounded-xl bg-[#25D366] px-4 py-3 text-center font-bold text-zinc-950 hover:brightness-110"
          >
            📲 Compartir en WhatsApp
          </a>
          <button
            onClick={async () => {
              await copyToClipboard(saved.message);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-xl bg-zinc-100 px-4 py-3 font-bold text-zinc-900 hover:bg-white"
          >
            {copied ? "✅ ¡Copiado!" : "📋 Copiar Texto"}
          </button>
        </div>
        <a href="/" className="block text-center text-sm text-zinc-400 underline">
          Volver a la galería
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">Presentarme 🙋</h1>
      <p className="mb-5 text-sm text-zinc-400">
        Tu foto se convierte a .webp (800px, calidad 0.8) en tu navegador antes
        de subirse.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Foto de perfil
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-bold"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa"
              className="mt-2 h-40 w-full rounded-xl border border-zinc-800 object-cover select-none pointer-events-none [-webkit-touch-callout:none]"
              draggable={false}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={["gustos","disgustos","personalidad","dato_curioso","pasatiempos"].includes(f.key) ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-sm font-semibold">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              <input
                type={f.type || "text"}
                value={form[f.key] || ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                required={!!f.required}
                min={f.type === "number" ? 1 : undefined}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
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
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar presentación"}
        </button>
      </form>
    </div>
  );
}
