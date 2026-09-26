// Suivi de commande par trackingToken — CDC #20
// Chaque commande suivable dispose d'un token de 8 caractères ; le fallback de
// démonstration officiel `tk_bebba_1047_demo` est également accepté.
// La réponse ne divulgue aucune donnée personnelle au-delà du nécessaire
// (pas de téléphone ni d'adresse — respect de l'esprit CDC #90/#130).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isTrackingTokenFormat, DEMO_TRACKING_TOKEN } from "@/lib/order-state";
import { safeParseJSON } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get("token") ?? "").trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Code de suivi manquant." }, { status: 400 });
    }

    // Le fallback de démonstration est comparé tel quel ; les tokens normaux
    // sont normalisés en majuscules (tolérance de saisie utilisateur).
    const normalized = token === DEMO_TRACKING_TOKEN ? token : token.toUpperCase();

    if (!isTrackingTokenFormat(normalized)) {
      return NextResponse.json(
        { ok: false, error: "Format de code de suivi invalide (8 caractères attendus)." },
        { status: 400 },
      );
    }

    const order = await db.order.findUnique({
      where: { trackingToken: normalized },
      include: {
        items: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Aucune commande trouvée pour ce code de suivi." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      order: {
        number: order.number,
        status: order.status, // casse officielle CDC #14
        paymentStatus: order.paymentStatus, // CDC #17
        createdAt: order.createdAt,
        totals: {
          productsTotal: order.productsTotal,
          customizationsTotal: order.customizationsTotal,
          supplementsTotal: order.supplementsTotal,
          deliveryFee: order.deliveryFee,
          promotionsTotal: order.promotionsTotal,
          adjustmentsTotal: order.adjustmentsTotal,
          total: order.total,
        },
        amountToCollect: order.amountToCollect,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          options: safeParseJSON<{ optionId: string; name: string; priceAdjustment: number; quantity: number }[]>(i.options, []),
        })),
        events: order.events.map((e) => ({
          type: e.type,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    });
  } catch (e) {
    console.error("[GET /api/track]", e);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche du suivi. Merci de réessayer." },
      { status: 500 },
    );
  }
}
