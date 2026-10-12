/**
 * Reconocimiento persistente de integrante (doble capa):
 * localStorage + cookie a 365 días. Si una capa se pierde,
 * se restaura desde la otra para persistencia ilimitada.
 */
const KEY = "my_presentation_id";
const YEAR_SECONDS = 365 * 24 * 3600;

export function saveMyPresentationId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // almacenamiento no disponible (modo privado, etc.)
  }
  document.cookie = `${KEY}=${id}; max-age=${YEAR_SECONDS}; path=/; SameSite=Lax`;
}

export function readLocalId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function readCookieId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${KEY}=([^;]*)`));
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

/** Lee el id de cualquiera de las dos capas (local primero). */
export function readMyPresentationId(): string | null {
  return readLocalId() ?? readCookieId();
}

/**
 * Sincroniza ambas capas: si el id existe en una pero falta en la
 * otra, restaura el valor faltante. Devuelve el id efectivo o null.
 */
export function syncMyPresentationId(): string | null {
  const local = readLocalId();
  const cookie = readCookieId();
  const id = local ?? cookie;
  if (!id) return null;
  if (!local) {
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // ignorar
    }
  }
  if (!cookie) {
    document.cookie = `${KEY}=${id}; max-age=${YEAR_SECONDS}; path=/; SameSite=Lax`;
  }
  return id;
}

/** Limpia ambas capas (cambiar de ficha). */
export function clearMyPresentationId(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
  document.cookie = `${KEY}=; max-age=0; path=/;`;
}
