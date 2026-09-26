// Seed Bloc 2 — BEBBA Healthy Food
// Personnalisation (CDC #11/#12), zones provisoires (CDC #67/#150), réglages,
// commande de démonstration avec le fallback de tracking officiel (CDC #20).
// Idempotent : peut être relancé sans dupliquer les données.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seed Bloc 2 BEBBA — démarrage");

  // ── 1. Options de personnalisation provisoires (CDC #12 — exemples du CDC) ──
  // Données de démonstration modifiables/supprimables depuis l'administration.
  const OPTION_SETS: Record<string, { name: string; priceAdjustment: number; maxQuantity?: number }[]> = {
    "bowl-quinoa-poulet": [
      { name: "Portion supplémentaire de protéines", priceAdjustment: 2500, maxQuantity: 2 },
      { name: "Supplément de légumes", priceAdjustment: 1000, maxQuantity: 2 },
      { name: "Sauce maison allégée", priceAdjustment: 500, maxQuantity: 3 },
    ],
    "salade-saumon-epeautre": [
      { name: "Portion supplémentaire de protéines", priceAdjustment: 2500, maxQuantity: 2 },
      { name: "Supplément de légumes", priceAdjustment: 1000, maxQuantity: 2 },
    ],
    "poke-vegetarien": [
      { name: "Supplément de légumes", priceAdjustment: 1000, maxQuantity: 2 },
      { name: "Tofu supplémentaire", priceAdjustment: 2000, maxQuantity: 2 },
      { name: "Avocat en plus", priceAdjustment: 1500, maxQuantity: 2 },
    ],
    "poulet-citron-herbes": [
      { name: "Portion supplémentaire de protéines", priceAdjustment: 2500, maxQuantity: 2 },
      { name: "Supplément de légumes", priceAdjustment: 1000, maxQuantity: 2 },
    ],
    "dorade-grillee": [
      { name: "Portion supplémentaire de protéines", priceAdjustment: 2500, maxQuantity: 2 },
      { name: "Sauce maison allégée", priceAdjustment: 500, maxQuantity: 3 },
    ],
    "mini-burgers-poulet": [
      { name: "Mini burger supplémentaire", priceAdjustment: 6000, maxQuantity: 2 },
      { name: "Supplément de légumes", priceAdjustment: 1000, maxQuantity: 2 },
    ],
    "jus-detox-vert": [
      { name: "Shot de gingembre", priceAdjustment: 700, maxQuantity: 2 },
      { name: "Graines de chia", priceAdjustment: 500, maxQuantity: 1 },
    ],
    "programme-30j-equilibre": [
      { name: "Adaptation végétarienne", priceAdjustment: 0 },
      { name: "Jus détox quotidien en plus", priceAdjustment: 6000, maxQuantity: 1 },
    ],
    "programme-30j-sportif": [
      { name: "Collation protéinée en plus", priceAdjustment: 3000, maxQuantity: 2 },
      { name: "Jus détox quotidien en plus", priceAdjustment: 6000, maxQuantity: 1 },
    ],
    // « brochettes-boeuf », « wrap-dinde-enfants », « jus-carotte-orange » et
    // « bowl-saumon-teriyaki » (indisponible) restent sans option pour
    // démontrer le parcours sans personnalisation (même système, CDC #11.3).
  };

  let optionsCreated = 0;
  for (const [slug, options] of Object.entries(OPTION_SETS)) {
    const product = await db.product.findUnique({ where: { slug } });
    if (!product) {
      console.warn(`⚠️ Produit introuvable pour les options : ${slug}`);
      continue;
    }
    for (const [i, opt] of options.entries()) {
      const existing = await db.productOption.findFirst({
        where: { productId: product.id, name: opt.name },
      });
      if (existing) continue;
      await db.productOption.create({
        data: {
          productId: product.id,
          name: opt.name,
          priceAdjustment: opt.priceAdjustment,
          maxQuantity: opt.maxQuantity ?? 1,
          sortOrder: i,
        },
      });
      optionsCreated++;
    }
  }
  console.log(`✅ Options de personnalisation : ${optionsCreated} créées`);

  // ── 2. Zone de livraison provisoire (CDC #67 / #150 — aucune supposition #229) ──
  await db.deliveryZone.upsert({
    where: { name: "Zone unique (provisoire)" },
    update: {},
    create: {
      name: "Zone unique (provisoire)",
      description:
        "Zone de démonstration — le périmètre réel et les frais de livraison restent à confirmer par le restaurant.",
      feeMillimes: 0,
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log("✅ Zone de livraison provisoire prête (frais 0 — à confirmer)");

  // ── 3. Réglages applicatifs (CDC #148 / #151 / #80) ──
  const SETTINGS: Record<string, string> = {
    default_country_code: "216", // indicatif par défaut pour la normalisation (CDC #7)
    order_min_millimes: "0", // aucune commande minimale tant que non décidée (CDC #151)
    max_quantity_per_item: "20", // garde-fou quantitatif configurable (CDC #80)
    opening_hours_display: "Lun–Dim · 11h00 – 22h30", // placeholder affiché — à confirmer
    delivery_note: "Zone et frais de livraison provisoires — en attente de confirmation du restaurant.",
  };
  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`✅ Réglages : ${Object.keys(SETTINGS).length} clés`);

  // ── 4. Commande de démonstration — fallback officiel CDC #20 ──
  // trackingToken : tk_bebba_1047_demo (fallback de démonstration du CDC #20)
  const DEMO_TOKEN = "tk_bebba_1047_demo";
  const existingDemo = await db.order.findUnique({ where: { trackingToken: DEMO_TOKEN } });
  if (existingDemo) {
    console.log("ℹ️ Commande de démonstration déjà présente (BEB-1047)");
  } else {
    const bowl = await db.product.findUnique({
      where: { slug: "bowl-quinoa-poulet" },
      include: { options: true },
    });
    if (bowl) {
      const proteineOption = bowl.options.find((o) => o.name.includes("protéines"));
      const unitPrice = bowl.price; // 16500
      const optQty = 1;
      const itemQty = 1;
      const adjustment = proteineOption ? proteineOption.priceAdjustment * optQty : 0; // 2500
      const lineTotal = (unitPrice + adjustment) * itemQty;
      const productsTotal = unitPrice * itemQty;
      const supplementsTotal = adjustment * itemQty;
      const total = productsTotal + supplementsTotal;
      const base = Date.now() - 95 * 60 * 1000; // commande passée il y a 95 min
      const at = (minutesAfter: number) => new Date(base + minutesAfter * 60 * 1000);

      const demoOrder = await db.order.create({
        data: {
          number: "BEB-1047",
          trackingToken: DEMO_TOKEN,
          status: "delivering", // casse officielle CDC #14
          customerPhone: "0021698123456", // exemple de normalisation CDC #7
          customerName: "Client de démonstration",
          deliveryAddress: "Rue de la Démonstration, Tunis — commande de démonstration",
          productsTotal,
          customizationsTotal: 0,
          supplementsTotal,
          deliveryFee: 0,
          promotionsTotal: 0,
          adjustmentsTotal: 0,
          total,
          paymentStatus: "to_collect", // CDC #17
          amountToCollect: total,
          amountCollected: 0,
          createdAt: at(0),
          items: {
            create: {
              productId: bowl.id,
              productName: bowl.name,
              unitPrice,
              quantity: itemQty,
              options: JSON.stringify(
                proteineOption
                  ? [{ optionId: proteineOption.id, name: proteineOption.name, priceAdjustment: proteineOption.priceAdjustment, quantity: optQty }]
                  : [],
              ),
              lineTotal,
            },
          },
          events: {
            create: [
              { type: "created", toStatus: "received", note: "Commande de démonstration créée", createdAt: at(0) },
              { type: "status_change", fromStatus: "received", toStatus: "preparing", createdAt: at(5) },
              { type: "status_change", fromStatus: "preparing", toStatus: "ready", createdAt: at(30) },
              { type: "status_change", fromStatus: "ready", toStatus: "waiting_for_driver", createdAt: at(35) },
              { type: "status_change", fromStatus: "waiting_for_driver", toStatus: "delivering", createdAt: at(50) },
            ],
          },
        },
      });
      console.log(`✅ Commande de démonstration ${demoOrder.number} créée (token : ${DEMO_TOKEN})`);
    }
  }

  const counts = {
    options: await db.productOption.count(),
    zones: await db.deliveryZone.count(),
    settings: await db.setting.count(),
    orders: await db.order.count(),
  };
  console.log(`✅ Seed Bloc 2 terminé : ${JSON.stringify(counts)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
