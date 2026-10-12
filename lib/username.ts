/** Dominio interno ficticio para usuarios simples (ej. "admin1" -> "admin1@grupo.local") */
export const INTERNAL_DOMAIN = "@grupo.local";

/** ¿El texto ya parece un correo (contiene @)? */
export function isEmailLike(input: string): boolean {
  return input.includes("@");
}

/**
 * Normaliza el identificador a un email válido para Supabase Auth.
 * Sin @ -> agrega el dominio interno; con @ -> solo limpia.
 */
export function toAuthEmail(input: string): string {
  const clean = input.trim().toLowerCase();
  if (!clean) return "";
  if (clean.includes("@")) return clean;
  return `${clean}${INTERNAL_DOMAIN}`;
}

/**
 * Para mostrar: "admin1@grupo.local" -> "admin1".
 * Los correos reales se muestran completos.
 */
export function displayUsername(email: string | null | undefined): string {
  if (!email) return "";
  const lower = email.toLowerCase();
  if (lower.endsWith(INTERNAL_DOMAIN)) {
    return email.slice(0, email.length - INTERNAL_DOMAIN.length);
  }
  return email;
}

/** Entrada válida: correo completo o usuario simple (2-30 chars, letras/números/._-) */
export function isValidLoginInput(input: string): boolean {
  const clean = input.trim();
  if (!clean || /\s/.test(clean)) return false;
  if (clean.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.toLowerCase());
  }
  return /^[a-z0-9._-]{2,30}$/i.test(clean);
}
