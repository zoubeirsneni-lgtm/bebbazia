// BEBBA Healthy Food — Liste des livreurs actifs (CDC #160)
// Sert à la sélection de session de l'espace livreur (V1 : PIN transitoire,
// Bloc 4 = comptes complets). Seuls les livreurs ACTIFS apparaissent.

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const drivers = await db.driver.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return Response.json({ drivers });
}
