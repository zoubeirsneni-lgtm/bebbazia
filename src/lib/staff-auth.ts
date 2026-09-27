// BEBBA Healthy Food — Garde d'accès staff du Bloc 3
// Mesure TRANSITOIRE : le Bloc 4 livrera l'authentification complète
// (NextAuth + matrice de permissions RBAC du CDC #52-#56, #141-#142).
// En attendant, chaque API d'écriture staff vérifie le PIN de son rôle
// côté serveur via l'en-tête X-Staff-Pin — le principe READ ONLY du CDC
// (#54 / #142) impose que la protection ne soit jamais seulement visuelle.

import { db } from "@/lib/db";

export type StaffRole = "kitchen" | "driver";

export const STAFF_PIN_HEADER = "x-staff-pin";

/** Vérifie le PIN du rôle côté serveur. Aucun raccourci côté client possible. */
export async function verifyStaffPin(role: StaffRole, pin: string | null | undefined): Promise<boolean> {
  if (typeof pin !== "string" || pin.length === 0) return false;
  const setting = await db.setting.findUnique({ where: { key: `staff_pin_${role}` } });
  if (!setting) return false;
  return timingSafeEqual(pin, setting.value);
}

/** Comparaison à temps constant (limite les attaques temporelles). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Réponse standard en cas de PIN invalide. */
export function staffUnauthorized() {
  return Response.json(
    { error: "Code d'accès requis ou invalide." },
    { status: 401 },
  );
}
