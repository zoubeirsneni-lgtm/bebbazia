// BEBBA Healthy Food — API cuisine / KDS (CDC #21, #155)
// GET : file de production claire — commandes reçues / en préparation / prêtes,
// avec les informations nécessaires à la production (CDC #21) et l'état des
// alertes de stock (CDC #25, #156 — rupture gérée explicitement).

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { STAFF_PIN_HEADER, staffUnauthorized, verifyStaffPin } from "@/lib/staff-auth";
import { computeOrderNeeds, formatMilliQuantity } from "@/lib/stock";

export const dynamic = "force-dynamic";

const KITCHEN_STATUSES = ["received", "preparing", "ready"] as const;

export async function GET(req: NextRequest) {
  const pin = req.headers.get(STAFF_PIN_HEADER);
  if (!(await verifyStaffPin("kitchen", pin))) return staffUnauthorized();

  const orders = await db.order.findMany({
    where: { status: { in: [...KITCHEN_STATUSES] } },
    include: {
      items: true,
      zone: true,
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" }, // file FIFO claire (CDC #155)
  });

  // Besoins et alertes par commande
  const enriched = await Promise.all(
    orders.map(async (order) => {
      const { needs, productsWithoutRecipe } = await computeOrderNeeds(order.id);
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        createdAt: order.createdAt,
        preparingSince: order.events.find((e) => e.toStatus === "preparing")?.createdAt ?? null,
        customerName: order.customerName,
        addressNotes: order.addressNotes,
        zoneName: order.zone?.name ?? null,
        deliveryAddress: order.deliveryAddress,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          options: JSON.parse(item.options) as { name: string; quantity: number; priceAdjustment: number }[],
        })),
        needs: needs.map((n) => ({
          name: n.name,
          unit: n.unit,
          display: formatMilliQuantity(n.quantityMilliUnits, n.unit),
        })),
        productsWithoutRecipe,
      };
    }),
  );

  // Alertes de stock globales (CDC #25 : seuil d'alerte — CDC #156 : rupture explicite)
  const ingredients = await db.ingredient.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const alerts = ingredients
    .filter((i) => i.stockQuantity < 0 || i.stockQuantity <= i.alertThreshold)
    .map((i) => ({
      name: i.name,
      unit: i.unit,
      stockQuantity: i.stockQuantity,
      alertThreshold: i.alertThreshold,
      level: (i.stockQuantity < 0 ? "negative" : "below_threshold") as "negative" | "below_threshold",
    }));

  return Response.json({ orders: enriched, stockAlerts: alerts });
}
