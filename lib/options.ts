/** Opciones estandarizadas para selects (registro y edición) */

export const PAISES = [
  // América del Sur
  "Perú",
  "Argentina",
  "Bolivia",
  "Chile",
  "Colombia",
  "Ecuador",
  "Paraguay",
  "Uruguay",
  "Venezuela",
  // América Central
  "Costa Rica",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "Nicaragua",
  "Panamá",
  // Caribe
  "Cuba",
  "República Dominicana",
  "Puerto Rico",
  // Norteamérica / Europa / África
  "México",
  "España",
  "Estados Unidos",
  "Guinea Ecuatorial",
  // Opción final
  "Otro",
];

export const GENEROS = ["Masculino", "Femenino", "Otro / Prefiero no decir"];

export const EDAD_MIN = 8;
export const EDAD_MAX = 80;
export const EDADES: number[] = Array.from(
  { length: EDAD_MAX - EDAD_MIN + 1 },
  (_, i) => EDAD_MIN + i
);
