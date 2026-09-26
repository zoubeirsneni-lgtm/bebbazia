// Utilitaires de formatage BEBBA
// Prix stockés en millimes (TND, 3 décimales — règles CDC #65/#179)

export function formatTND(millimes: number): string {
  const dinars = Math.floor(millimes / 1000);
  const milli = millimes % 1000;
  const milliStr = milli.toString().padStart(3, "0");
  return `${dinars.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")},${milliStr} DT`;
}

export function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
