// BEBBA Healthy Food — Transition de statut côté cuisine (CDC #14, #16, #21, #22, #43, #64)
//
// CŒUR DU BLOC 3 : la consommation du stock est déclenchée UNIQUEMENT par la
// transition `received → preparing` (CDC #22 — règle définitive #10) :
//   • une seule fois — contrainte d'unicité DB @@unique([ingredientId, orderId,
//     type]) + champ Order.stockConsumedAt ;
//   • transactionnelle — tout s'exécute dans une transaction Prisma interactive ;
//   • idempotente — un double clic / double requête ne re-consomme jamais
//     (statut déjà appliqué → réponse « already » sans réécriture) ;
//   • traçable — un mouvement StockMovement par ingrédient + événement
//     `stock_consumed` dans la chronologie (CDC #63).
//
// Aucune autre transition ne consomme du stock. SQLite sérialise les
// écrivains : deux requêtes strictement concurrentes ne peuvent jamais
// consommer deux fois (la seconde échoue sur la contrainte unique et la
// transaction est annulée intégralement).
//
// Transitions autorisées côté cuisine (machine d'état CDC #64) :
//   received → preparing | ready → waiting_for_driver | preparing → ready
//   annulation uniquement depuis received / preparing (CDC #43).
// delivering → delivered appartient à l'espace livreur.

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { STAFF_PIN_HEADER, staffUnauthorized, verifyStaffPin } from "@/lib/staff-auth";
import { ALLOWED_TRANSITIONS, isOrderStatus, STATUS_LABELS_FR, type OrderStatus } from "@/lib/order-state";
import { CONSUMPTION, computeOrderNeeds, formatMilliQuantity } from "@/lib/stock";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z.string().refine(isOrderStatus, "Statut cible invalide"),
});

const KITCHEN_TRANSITIONS: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["waiting_for_driver"],
  waiting_for_driver: [],
  delivering: [],
  delivered: [],
  cancelled: [],
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const pin = req.headers.get(STAFF_PIN_HEADER);
  if (!(await verifyStaffPin("kitchen", pin))) return staffUnauthorized();

  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const to = parsed.data.to as OrderStatus;

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new HttpError(404, "Commande introuvable.");

      // Idempotence du clic : la transition est déjà appliquée → réponse neutre
      // sans réécriture (CDC #22 : « ne doit pas être répétée lors d'une
      // répétition de requête »).
      if (order.status === to) {
        return { already: true as const, orderId: order.id, number: order.number };
      }

      const allowed = KITCHEN_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(to)) {
        throw new HttpError(
          409,
          `Transition interdite : ${order.status} → ${to} (machine d'état CDC #64).`,
        );
      }

      let consumption: ConsumptionResult | null = null;

      // ── Consommation du stock : uniquement received → preparing (CDC #22) ──
      if (to === "preparing" && order.status === "received") {
        if (order.stockConsumedAt) {
          // Défense en profondeur : déjà consommée par le passé → jamais deux fois.
          throw new HttpError(409, "Consommation du stock déjà effectuée pour cette commande.");
        }
        consumption = await consumeStockForOrder(tx, order.id);
      }

      // ── Transition de statut ──
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: to,
          ...(to === "preparing" && consumption
            ? { stockConsumedAt: new Date() }
            : {}),
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "status_change",
          fromStatus: order.status,
          toStatus: to,
          note: to === "cancelled" ? "Annulée par la cuisine" : null,
        },
      });

      if (consumption) {
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "stock_consumed",
            note: `Stock consommé : ${consumption.consumed
              .map((c) => `${c.name} −${formatMilliQuantity(c.quantityMilliUnits, c.unit)}`)
              .join(", ") || "aucune recette liée"}`,
          },
        });
      }

      return { already: false as const, orderId: order.id, number: order.number, to, consumption };
    });

    if (result.already) {
      return Response.json({
        status: "already",
        message: `Commande déjà en « ${STATUS_LABELS_FR[to] ?? to} » — aucune action répétée.`,
        orderId: result.orderId,
        orderNumber: result.number,
      });
    }

    return Response.json({
      status: "ok",
      orderId: result.orderId,
      orderNumber: result.number,
      to: result.to,
      stockConsumption: result.consumption
        ? {
            consumed: result.consumption.consumed.map((c) => ({
              name: c.name,
              display: formatMilliQuantity(c.quantityMilliUnits, c.unit),
            })),
            productsWithoutRecipe: result.consumption.productsWithoutRecipe,
            alerts: result.consumption.alerts,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    // Contrainte d'unicité violée (course concurrente extrême) : la
    // consommation a déjà eu lieu — réponse idempotente, jamais de re-consommation.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json(
        { status: "already", message: "Consommation déjà enregistrée — aucune répétition effectuée." },
        { status: 200 },
      );
    }
    console.error("[staff/status] erreur:", error);
    return Response.json({ error: "Erreur serveur lors de la transition." }, { status: 500 });
  }
}

interface ConsumptionResult {
  consumed: { name: string; unit: string; quantityMilliUnits: number }[];
  productsWithoutRecipe: string[];
  alerts: { name: string; unit: string; stockQuantity: number; level: "below_threshold" | "negative" }[];
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function consumeStockForOrder(tx: Tx, orderId: string): Promise<ConsumptionResult> {
  const { needs, productsWithoutRecipe } = await computeOrderNeeds(orderId);

  const consumed: ConsumptionResult["consumed"] = [];
  const alerts: ConsumptionResult["alerts"] = [];

  for (const need of needs) {
    // 1) Mouvement traçable — la contrainte @@unique([ingredientId, orderId,
    //    type]) interdit tout doublon au niveau de la base (CDC #22).
    await tx.stockMovement.create({
      data: {
        ingredientId: need.ingredientId,
        orderId,
        type: CONSUMPTION,
        quantityMilliUnits: -need.quantityMilliUnits,
        note: "Consommation automatique au clic « En préparation »",
      },
    });

    // 2) Décrément du stock — n'exécuté QUE si le mouvement a été créé.
    const updated = await tx.ingredient.update({
      where: { id: need.ingredientId },
      data: { stockQuantity: { decrement: need.quantityMilliUnits } },
    });

    consumed.push({ name: need.name, unit: need.unit, quantityMilliUnits: need.quantityMilliUnits });

    // 3) Alerte explicite si le seuil est franchi ou stock négatif (CDC #156)
    if (updated.stockQuantity < 0 || updated.stockQuantity <= updated.alertThreshold) {
      alerts.push({
        name: updated.name,
        unit: updated.unit,
        stockQuantity: updated.stockQuantity,
        level: updated.stockQuantity < 0 ? "negative" : "below_threshold",
      });
    }
  }

  return { consumed, productsWithoutRecipe, alerts };
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
