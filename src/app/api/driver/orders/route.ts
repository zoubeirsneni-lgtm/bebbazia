// BEBBA Healthy Food — API espace livreur (CDC #30, #33, #34, #49, #50, #106,
// #157, #158, #159, #160, #162)
//
// GET    : file des commandes à prendre + mes livraisons en cours.
// POST   : actions du livreur — accept | delivered | refuse | fail.
//   • accept    : waiting_for_driver → delivering, affectation tracée (CDC #33)
//   • delivered : delivering → delivered (CDC #49 / #50 — la confirmation de
//                 livraison est DISTINCTE de l'encaissement : le COD reste
//                 `to_collect`, aucun changement automatique, CDC #18)
//   • refuse    : refus tracé, la commande reste disponible (CDC #157)
//   • fail      : échec avec motif OBLIGATOIRE, retour en attente de livreur,
//                 tentative comptée (CDC #158 / #159)
//
// Le livreur n'opère QUE sur ses commandes (vérification driverId à chaque
// action) et uniquement selon la machine d'état (CDC #64).

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { STAFF_PIN_HEADER, staffUnauthorized, verifyStaffPin } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const DRIVER_PIN_HEADER = "x-driver-id";

/** Vérifie le PIN livreur + l'identité du livreur actif (session V1, Bloc 4 = comptes complets). */
async function requireDriver(req: NextRequest): Promise<{ id: string; name: string } | null> {
  const pin = req.headers.get(STAFF_PIN_HEADER);
  if (!(await verifyStaffPin("driver", pin))) return null;
  const driverId = req.headers.get(DRIVER_PIN_HEADER);
  if (!driverId) return null;
  const driver = await db.driver.findUnique({ where: { id: driverId } });
  if (!driver || !driver.isActive) return null; // désactivé → accès refusé (CDC #31 / #160)
  return { id: driver.id, name: driver.name };
}

function driverUnauthorized() {
  return Response.json({ error: "Livreur non reconnu ou désactivé." }, { status: 401 });
}

// ─── GET : file de travail ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const driver = await requireDriver(req);
  if (!driver) return driverUnauthorized();

  const [pending, mine] = await Promise.all([
    db.order.findMany({
      where: { status: "waiting_for_driver", driverId: null },
      include: { zone: true },
      orderBy: { createdAt: "asc" },
    }),
    db.order.findMany({
      where: { status: "delivering", driverId: driver.id },
      include: { zone: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const shape = (o: typeof pending[number]) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    deliveryAddress: o.deliveryAddress,
    addressNotes: o.addressNotes,
    zoneName: o.zone?.name ?? null,
    total: o.total,
    amountToCollect: o.amountToCollect,
    paymentStatus: o.paymentStatus,
    customerPhone: o.customerPhone,
    customerName: o.customerName,
    deliveryAttempts: o.deliveryAttempts,
    lastDeliveryIssue: o.lastDeliveryIssue,
    createdAt: o.createdAt,
  });

  return Response.json({ driver: { id: driver.id, name: driver.name }, pending: pending.map(shape), mine: mine.map(shape) });
}

// ─── POST : actions ──────────────────────────────────────────────────────────

const actionSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(["accept", "delivered", "refuse", "fail"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const driver = await requireDriver(req);
  if (!driver) return driverUnauthorized();

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Action invalide." }, { status: 400 });
  }
  const { orderId: id, action, note } = parsed.data;

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });

  // Idempotence d'action : déjà dans l'état cible → réponse neutre.
  if (action === "accept" && order.status === "delivering" && order.driverId === driver.id) {
    return Response.json({ status: "already", message: "Livraison déjà prise en charge." });
  }
  if (action === "delivered" && order.status === "delivered") {
    return Response.json({ status: "already", message: "Livraison déjà confirmée." });
  }

  switch (action) {
    case "accept": {
      if (order.status !== "waiting_for_driver") {
        return Response.json({ error: "Cette commande n'est plus en attente de livreur." }, { status: 409 });
      }
      if (order.driverId && order.driverId !== driver.id) {
        // Réaffectation = administration (CDC #33) — jamais par un autre livreur.
        return Response.json({ error: "Commande déjà affectée à un autre livreur." }, { status: 409 });
      }
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: { status: "delivering", driverId: driver.id },
        }),
        db.orderEvent.create({
          data: {
            orderId: order.id,
            type: "driver_assigned",
            fromStatus: "waiting_for_driver",
            toStatus: "delivering",
            note: `Prise en charge par ${driver.name}`,
          },
        }),
      ]);
      return Response.json({ status: "ok", message: "Livraison prise en charge." });
    }

    case "delivered": {
      if (order.status !== "delivering") {
        return Response.json({ error: "Seule une commande en livraison peut être livrée." }, { status: 409 });
      }
      if (order.driverId !== driver.id) {
        return Response.json({ error: "Cette livraison est affectée à un autre livreur." }, { status: 403 });
      }
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: { status: "delivered", deliveryAttempts: { increment: 1 } },
          // COD inchangé : to_collect — livraison ≠ encaissement (CDC #18 / #50)
        }),
        db.orderEvent.create({
          data: {
            orderId: order.id,
            type: "status_change",
            fromStatus: "delivering",
            toStatus: "delivered",
            note: `Livraison confirmée par ${driver.name}`,
          },
        }),
      ]);
      return Response.json({
        status: "ok",
        message: `Livraison confirmée. Montant à encaisser : ${(order.amountToCollect / 1000).toFixed(3)} DT — l'encaissement reste à confirmer séparément (CDC #50).`,
      });
    }

    case "refuse": {
      if (order.status !== "waiting_for_driver") {
        return Response.json({ error: "Seule une commande en attente peut être refusée." }, { status: 409 });
      }
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: { lastDeliveryIssue: note ?? "Refus du livreur" },
        }),
        db.orderEvent.create({
          data: {
            orderId: order.id,
            type: "driver_refused",
            note: `Refus de prise en charge par ${driver.name}${note ? ` — motif : ${note}` : ""}`,
          },
        }),
      ]);
      return Response.json({ status: "ok", message: "Refus enregistré et tracé." });
    }

    case "fail": {
      if (order.status !== "delivering") {
        return Response.json({ error: "Seule une commande en livraison peut échouer." }, { status: 409 });
      }
      if (order.driverId !== driver.id) {
        return Response.json({ error: "Cette livraison est affectée à un autre livreur." }, { status: 403 });
      }
      if (!note || note.trim().length < 3) {
        return Response.json({ error: "Le motif d'échec est obligatoire (CDC #158)." }, { status: 400 });
      }
      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: {
            status: "waiting_for_driver",
            deliveryAttempts: { increment: 1 },
            lastDeliveryIssue: note.trim(),
          },
        }),
        db.orderEvent.create({
          data: {
            orderId: order.id,
            type: "delivery_failed",
            fromStatus: "delivering",
            toStatus: "waiting_for_driver",
            note: `Échec de livraison (${driver.name}) — motif : ${note.trim()}. Nouvelle tentative possible (CDC #159).`,
          },
        }),
      ]);
      return Response.json({ status: "ok", message: "Échec enregistré — commande à nouveau en attente." });
    }
  }
}
