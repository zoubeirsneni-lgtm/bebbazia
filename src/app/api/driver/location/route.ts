// BEBBA Healthy Food — Transmission GPS du livreur (CDC #12 / #34 / #162, #13 / #35 / #163)
//
// RÈGLES STRICTES :
//   • La position n'est acceptée QUE pendant une livraison `delivering` du
//     livreur (CDC #12 : « Pendant l'état delivering ») — fin du suivi dès que
//     les conditions métier ne sont plus réunies (CDC #133).
//   • Throttle serveur : une position par 10 s max par livreur. Une requête
//     plus rapide reçoit 202 { recorded: false } — pas une erreur.
//   • AUCUNE position fictive n'est jamais générée : les coordonnées proviennent
//     exclusivement du navigateur du livreur, validées en plages réelles (CDC #34).
//   • Rétention 72 h (CDC #13 / #163) : purge opportuniste à chaque écriture
//     (fonctionne sans cron — compatible hébergements serverless) + endpoint
//     d'administration possible plus tard.
//   • Feedback honnête (CDC #106) : la réponse dit explicitement si la position
//     a été enregistrée — l'UI ne présente jamais comme « enregistrée » une
//     position non confirmée par le serveur.

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { STAFF_PIN_HEADER, staffUnauthorized, verifyStaffPin } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const GPS_INTERVAL_MS = 10_000; // CDC #12 / #162 — 10 secondes
const RETENTION_MS = 72 * 60 * 60 * 1000; // CDC #13 / #163 — 72 heures

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100_000).optional(),
  speedKmh: z.number().min(0).max(300).optional(),
  // Contexte optionnel : la commande en cours de livraison du livreur
  orderId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const pin = req.headers.get(STAFF_PIN_HEADER);
  if (!(await verifyStaffPin("driver", pin))) return staffUnauthorized();

  const driverId = req.headers.get("x-driver-id");
  if (!driverId) return Response.json({ error: "Livreur non identifié." }, { status: 401 });
  const driver = await db.driver.findUnique({ where: { id: driverId } });
  if (!driver || !driver.isActive) {
    return Response.json({ error: "Livreur non reconnu ou désactivé." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Coordonnées GPS invalides." }, { status: 400 });
  }
  const { lat, lng, accuracyM, speedKmh, orderId } = parsed.data;

  // Le livreur doit avoir au moins une commande en livraison (CDC #12)
  const delivering = await db.order.findFirst({
    where: { status: "delivering", driverId: driver.id, ...(orderId ? { id: orderId } : {}) },
    orderBy: { createdAt: "asc" },
  });
  if (!delivering) {
    return Response.json(
      { recorded: false, reason: "no_active_delivery", message: "Aucune livraison en cours — transmission GPS non applicable (CDC #12)." },
      { status: 202 },
    );
  }

  // Throttle 10 s côté serveur (source de vérité — l'appareil ne décide pas)
  const last = await db.driverLocation.findFirst({
    where: { driverId: driver.id },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  if (last && Date.now() - last.recordedAt.getTime() < GPS_INTERVAL_MS) {
    const waitMs = GPS_INTERVAL_MS - (Date.now() - last.recordedAt.getTime());
    return Response.json(
      { recorded: false, reason: "throttled", nextSendInMs: waitMs, message: "Position ignorée — la fréquence maximale est une position toutes les 10 secondes." },
      { status: 202 },
    );
  }

  const recorded = await db.driverLocation.create({
    data: { driverId: driver.id, orderId: delivering.id, lat, lng, accuracyM, speedKmh },
  });

  // Purge opportuniste de la rétention 72 h (CDC #13 / #35 / #163)
  const purge = await db.driverLocation.deleteMany({
    where: { recordedAt: { lt: new Date(Date.now() - RETENTION_MS) } },
  });

  return Response.json({
    recorded: true,
    locationId: recorded.id,
    recordedAt: recorded.recordedAt,
    orderId: delivering.id,
    orderNumber: delivering.number,
    purgedOlderThan: purge.count,
  });
}
