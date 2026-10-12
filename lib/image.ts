/** Mensaje estándar cuando la imagen es HEIC de iPhone (no decodificable en navegador) */
export const HEIC_MSG =
  "Las fotos HEIC de iPhone no son compatibles: ábrela en Fotos, expórtala como JPG e inténtalo de nuevo.";

/** Detecta HEIC/HEIF por MIME o extensión (formato por defecto de iOS) */
export function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.hei[c f]$/i.test(file.name)
  );
}

/**
 * Compresión client-side a .webp usando Canvas API (HTML5).
 * - Ancho máximo 800px (mantiene aspect-ratio)
 * - Calidad 0.8 por defecto
 * - No hace upscale si la imagen ya es menor
 */
export async function compressToWebp(
  file: File,
  maxWidth = 800,
  quality = 0.8
): Promise<Blob> {
  if (isHeicFile(file)) throw new Error(HEIC_MSG);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "No se pudo leer la imagen. Si es HEIC de iPhone, expórtala como JPG primero."
    );
  }

  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no soportado en este navegador");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", quality)
  );
  if (!blob) throw new Error("No se pudo convertir la imagen a .webp");
  return blob;
}

/** Genera un nombre único para Storage */
export function buildWebpFileName(userHint = "foto"): string {
  const safe = userHint
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  return `${Date.now()}-${safe || "foto"}-${Math.random()
    .toString(36)
    .slice(2, 8)}.webp`;
}
