export type Presentacion = {
  id: string;
  nombre: string;
  edad: number | null;
  pais: string | null;
  genero: string | null;
  whatsapp_user: string | null;
  anime_favorito: string | null;
  color_favorito: string | null;
  musica_favorita: string | null;
  pasatiempos: string | null;
  gustos: string | null;
  disgustos: string | null;
  personalidad: string | null;
  dato_curioso: string | null;
  foto_url: string | null;
  created_at: string;
};

export type PresentacionInput = Omit<Presentacion, "id" | "created_at">;

export type UserRole = {
  user_id: string;
  email: string;
  role: "admin" | "super_admin";
};

export type AdminActivity = {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  details: string | null;
  created_at: string;
};

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}
