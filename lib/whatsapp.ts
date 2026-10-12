import type { Presentacion, PresentacionInput } from "./types";

type MsgInput = Partial<PresentacionInput | Presentacion>;

/** Plantilla de presentación en texto plano para WhatsApp (sin emojis) */
export function buildPresentationMessage(p: MsgInput): string {
  const lines = [
    "*NUEVA PRESENTACIÓN*",
    "",
    `*Nombre:* ${p.nombre ?? "-"}`,
    `*Edad:* ${p.edad ?? "-"}`,
    `*País:* ${p.pais ?? "-"}`,
    `*Género:* ${p.genero ?? "-"}`,
    `*WhatsApp:* ${p.whatsapp_user ?? "-"}`,
    "",
    `*Anime favorito:* ${p.anime_favorito ?? "-"}`,
    `*Color favorito:* ${p.color_favorito ?? "-"}`,
    `*Música favorita:* ${p.musica_favorita ?? "-"}`,
    `*Pasatiempos:* ${p.pasatiempos ?? "-"}`,
    "",
    `*Gustos:* ${p.gustos ?? "-"}`,
    `*Disgustos:* ${p.disgustos ?? "-"}`,
    `*Personalidad:* ${p.personalidad ?? "-"}`,
    `*Dato curioso:* ${p.dato_curioso ?? "-"}`,
  ];
  return lines.join("\n");
}

/**
 * Link de compartir SIN número: abre el selector de chats de WhatsApp.
 * https://api.whatsapp.com/send?text={MENSAJE_ENCODED}
 */
export function whatsappShareUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
