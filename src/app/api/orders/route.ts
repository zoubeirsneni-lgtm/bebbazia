// Création de commande — Bloc 2 (CDC #6 à #8, #11 à #17, #19, #20, #63, #66, #67, #79, #80, #85)
// Toute la logique de prix est RECALCULÉE côté serveur depuis la base : les
// montants envoyés par le client ne sont jamais considérés comme fiables.
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateTrackingToken } from "@/lib/order-state";
import { normalizePhone, isValidNormalizedPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// ── Schéma de validation de la requête ──────────────────────────────────────
const optionSchema = z.object({
  optionId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  options: z.array(optionSchema).max(12).default([]),
});

const bodySchema = z.object({
  phone: z.string().min(6).max(30),
  name: z.string().max(80).nullish(),
  address: z.string().min(8, "L'adresse de livraison doit être suffisamment complète (CDC #47).").max(400),
  addressNotes: z.string().max(300).nullish(),
  zoneId: z.string().min(1).nullish(),
  items: z.array(itemSchema).min(1, "Le panier est vide.").max(50),
  idempotencyKey: z.string().min(8).max(80).nullish(),
});

type OrderSummary = {
  number: string;
  trackingToken: string;
  status: string;
  productsTotal: number;
  customizationsTotal: number;
  supplementsTotal: number;
  deliveryFee: number;
  promotionsTotal: number;
  adjustmentsTotal: number;
  total: number;
  paymentStatus: string;
  amountToCollect: number;
};

async function getSetting(key: string): Promise<string | null> {
  const s = await db.setting.findUnique({ where: { key } });
  return s?.value ?? null;
}

// Numéro officiel séquentiel BEB-XXXX (CDC #19) — la commande de démonstration
// BEB-1047 existe, la numérotation continue à partir du maximum existant.
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.order.findMany({
    orderBy: { number: "desc" },
    take: 1,
    select: { number: true },
  });
  const lastNum = last[0]?.number.match(/^BEB-(\d+)$/);
  const next = lastNum ? parseInt(lastNum[1], 10) + 1 : 1;
  return `BEB-${String(next).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Requête invalide.";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    const body = parsed.data;

    // Clé d'idempotence : en-tête prioritaire, sinon champ du corps (CDC #85)
    const idempotencyKey = req.headers.get("idempotency-key") ?? body.idempotencyKey ?? null;

    // Idempotence : une reprise de requête renvoie la commande déjà créée (CDC #85)
    if (idempotencyKey) {
      const existing = await db.order.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return NextResponse.json(
          { ok: true, order: summarize(existing), duplicated: true },
          { status: 200 },
        );
      }
    }

    // Téléphone : identifiant client normalisé (CDC #7)
    const countryCode = (await getSetting("default_country_code")) ?? "216";
    const phone = normalizePhone(body.phone, countryCode);
    if (!isValidNormalizedPhone(phone)) {
      return NextResponse.json(
        { ok: false, error: "Numéro de téléphone invalide. Format attendu : 00 + indicatif + numéro (ex. 0021698123456)." },
        { status: 400 },
      );
    }

    // Zone de livraison (CDC #67 / #150)
    let deliveryFee = 0;
    let zoneId: string | null = null;
    if (body.zoneId) {
      const zone = await db.deliveryZone.findUnique({ where: { id: body.zoneId } });
      if (!zone || !zone.isActive) {
        return NextResponse.json({ ok: false, error: "Zone de livraison indisponible." }, { status: 400 });
      }
      deliveryFee = zone.feeMillimes;
      zoneId = zone.id;
    }

    // Recalcul serveur : produits + options chargés depuis la base
    const productIds = body.items.map((i) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { options: true },
    });

    let productsTotal = 0;
    let customizationsTotal = 0;
    let supplementsTotal = 0;
    const itemRows: {
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      options: string;
      lineTotal: number;
    }[] = [];

    for (const item of body.items) {
      const product = products.find((p) => p.id === item.productId);
      // Un produit indisponible ne doit pas pouvoir être commandé (CDC #79)
      if (!product) {
        return NextResponse.json({ ok: false, error: "Un produit du panier n'existe plus." }, { status: 400 });
      }
      if (!product.isAvailable) {
        return NextResponse.json(
          { ok: false, error: `« ${product.name} » est indisponible et ne peut pas être commandé.` },
          { status: 409 },
        );
      }

      const chosenOptions: { optionId: string; name: string; priceAdjustment: number; quantity: number }[] = [];
      let lineOptionsTotal = 0;
      let lineCustomizations = 0;
      let lineSupplements = 0;

      for (const chosen of item.options) {
        const option = product.options.find((o) => o.id === chosen.optionId);
        if (!option || option.productId !== product.id) {
          return NextResponse.json({ ok: false, error: `Option invalide pour « ${product.name} ».` }, { status: 400 });
        }
        if (!option.isAvailable) {
          return NextResponse.json(
            { ok: false, error: `L'option « ${option.name} » n'est pas disponible actuellement.` },
            { status: 409 },
          );
        }
        // Limites quantitatives des options (CDC #12) et garde-fou global (CDC #80)
        if (chosen.quantity > option.maxQuantity) {
          return NextResponse.json(
            { ok: false, error: `L'option « ${option.name} » est limitée à ${option.maxQuantity} par produit.` },
            { status: 400 },
          );
        }
        const money = option.priceAdjustment * chosen.quantity;
        if (option.priceAdjustment > 0) lineSupplements += money;
        else lineCustomizations += money;
        lineOptionsTotal += money;
        chosenOptions.push({
          optionId: option.id,
          name: option.name,
          priceAdjustment: option.priceAdjustment,
          quantity: chosen.quantity,
        });
      }

      const lineTotal = (product.price + lineOptionsTotal) * item.quantity;
      productsTotal += product.price * item.quantity;
      // Les options s'appliquent à chaque unité de la ligne (cohérence #66 :
      // total = Σ lignes = produits + personnalisations + suppléments)
      supplementsTotal += lineSupplements * item.quantity;
      customizationsTotal += lineCustomizations * item.quantity;

      itemRows.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        options: JSON.stringify(chosenOptions),
        lineTotal,
      });
    }

    // Commande minimale configurable (CDC #151) — 0 par défaut tant que non décidée
    const minOrder = parseInt((await getSetting("order_min_millimes")) ?? "0", 10);
    const merchandiseTotal = productsTotal + supplementsTotal + customizationsTotal;
    if (merchandiseTotal < minOrder) {
      return NextResponse.json(
        { ok: false, error: `Le montant minimum de commande n'est pas atteint.` },
        { status: 400 },
      );
    }

    // Décomposition du total (CDC #66) — promotions/ajustements réservés (Bloc 8)
    const promotionsTotal = 0;
    const adjustmentsTotal = 0;
    const total = merchandiseTotal + deliveryFee + promotionsTotal + adjustmentsTotal;

    // Paiement COD : montant à encaisser, statut initial to_collect (CDC #17)
    const paymentStatus = "to_collect";
    const amountToCollect = total;

    // Création transactionnelle : commande + lignes + événement initial (CDC #63)
    // Réessais en cas de collision de numéro/token (contraintes uniques).
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const created = await db.$transaction(async (tx) => {
          const number = await nextOrderNumber(tx);
          const trackingToken = generateTrackingToken();
          return tx.order.create({
            data: {
              number,
              trackingToken,
              status: "received", // état initial officiel (CDC #14)
              customerPhone: phone,
              customerName: body.name?.trim() || null,
              deliveryAddress: body.address.trim(),
              addressNotes: body.addressNotes?.trim() || null,
              zoneId,
              productsTotal,
              customizationsTotal,
              supplementsTotal,
              deliveryFee,
              promotionsTotal,
              adjustmentsTotal,
              total,
              paymentStatus,
              amountToCollect,
              idempotencyKey,
              items: { create: itemRows },
              events: {
                create: {
                  type: "created",
                  toStatus: "received",
                  note: "Commande créée par le client",
                },
              },
            },
          });
        });
        return NextResponse.json({ ok: true, order: summarize(created) }, { status: 201 });
      } catch (e) {
        lastError = e;
        const isUniqueViolation =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (!isUniqueViolation) throw e;
        // Collision de numéro ou de token → nouvelle tentative avec nouvelles valeurs
      }
    }
    throw lastError;
  } catch (e) {
    console.error("[POST /api/orders]", e);
    return NextResponse.json(
      { ok: false, error: "Une erreur est survenue lors de la création de la commande. Merci de réessayer." },
      { status: 500 },
    );
  }
}

function summarize(order: {
  number: string;
  trackingToken: string;
  status: string;
  productsTotal: number;
  customizationsTotal: number;
  supplementsTotal: number;
  deliveryFee: number;
  promotionsTotal: number;
  adjustmentsTotal: number;
  total: number;
  paymentStatus: string;
  amountToCollect: number;
}): OrderSummary {
  return {
    number: order.number,
    trackingToken: order.trackingToken,
    status: order.status,
    productsTotal: order.productsTotal,
    customizationsTotal: order.customizationsTotal,
    supplementsTotal: order.supplementsTotal,
    deliveryFee: order.deliveryFee,
    promotionsTotal: order.promotionsTotal,
    adjustmentsTotal: order.adjustmentsTotal,
    total: order.total,
    paymentStatus: order.paymentStatus,
    amountToCollect: order.amountToCollect,
  };
}
