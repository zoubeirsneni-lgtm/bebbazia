// BEBBA Healthy Food — Seed Bloc 3 (idempotent)
// Cuisine KDS + stock + livreurs + GPS de démonstration
// Conformité CDC : #10 stock au clic « En préparation », #12 GPS 10 s,
// #13 rétention 72 h, #21/#22 consommation idempotente, #23-#27 ingrédients/
// recettes, #160 disponibilité livreurs.
// ⚠️ Les positions GPS de la commande de DÉMONSTRATION BEB-1047 sont du
// contenu de seed étiqueté « démo » — le comportement runtime n'invente
// jamais de positions (CDC #34).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Ingrédients (milli-unités : 1 g = 1000) ────────────────────────────────

const INGREDIENTS: {
  name: string;
  unit: "g" | "ml" | "piece";
  stock: number; // milli-unités
  alert: number;
  costPer1000: number; // millimes pour 1000 unités de base
}[] = [
  { name: "Blanc de poulet", unit: "g", stock: 18_000_000, alert: 3_000_000, costPer1000: 12_000 },
  { name: "Escalope de dinde", unit: "g", stock: 12_000_000, alert: 2_500_000, costPer1000: 11_000 },
  { name: "Bœuf maigre (filet)", unit: "g", stock: 8_000_000, alert: 2_000_000, costPer1000: 28_000 },
  { name: "Saumon fumé", unit: "g", stock: 4_500_000, alert: 1_000_000, costPer1000: 45_000 },
  { name: "Filet de dorade", unit: "g", stock: 5_000_000, alert: 1_200_000, costPer1000: 32_000 },
  { name: "Quinoa", unit: "g", stock: 9_000_000, alert: 1_500_000, costPer1000: 9_000 },
  { name: "Épeautre", unit: "g", stock: 6_000_000, alert: 1_200_000, costPer1000: 7_000 },
  { name: "Riz complet", unit: "g", stock: 10_000_000, alert: 1_500_000, costPer1000: 4_500 },
  { name: "Mélange de salades fraîches", unit: "g", stock: 7_000_000, alert: 1_500_000, costPer1000: 3_500 },
  { name: "Tomates", unit: "g", stock: 8_000_000, alert: 1_500_000, costPer1000: 2_200 },
  { name: "Concombres", unit: "g", stock: 6_000_000, alert: 1_000_000, costPer1000: 1_800 },
  { name: "Avocat", unit: "piece", stock: 2_400_000, alert: 400_000, costPer1000: 9_500 }, // 2400 pièces
  { name: "Pain complet burger", unit: "piece", stock: 900_000, alert: 200_000, costPer1000: 6_000 }, // 900 pièces
  { name: "Yaourt grec 0%", unit: "ml", stock: 5_000_000, alert: 1_000_000, costPer1000: 5_500 },
  { name: "Citron jaune", unit: "piece", stock: 1_500_000, alert: 300_000, costPer1000: 1_200 }, // 1500 pièces
  { name: "Concombre pressé", unit: "ml", stock: 12_000_000, alert: 2_000_000, costPer1000: 1_500 },
  { name: "Pomme verte", unit: "piece", stock: 1_200_000, alert: 250_000, costPer1000: 1_400 }, // 1200 pièces
  { name: "Épinards frais", unit: "g", stock: 700_000, alert: 900_000, costPer1000: 4_000 }, // SOUS le seuil → alerte KDS
  { name: "Céleri", unit: "g", stock: 3_000_000, alert: 600_000, costPer1000: 1_600 },
  { name: "Herbes fraîches (menthe, persil)", unit: "g", stock: 400_000, alert: 100_000, costPer1000: 8_000 },
];

// ─── Recettes par portion (milli-unités) — produits du catalogue ─────────────

const RECIPES: Record<string, Record<string, number>> = {
  "bowl-quinoa-poulet": { "Blanc de poulet": 150_000, Quinoa: 120_000, "Mélange de salades fraîches": 60_000, Tomates: 80_000, "Citron jaune": 20_000 },
  "salade-saumon-epeautre": { "Saumon fumé": 100_000, "Épeautre": 90_000, "Mélange de salades fraîches": 70_000, Concombres: 60_000, "Yaourt grec 0%": 30_000 },
  "poke-vegetarien": { "Riz complet": 150_000, Avocat: 50_000, Concombres: 70_000, Tomates: 60_000, "Herbes fraîches (menthe, persil)": 10_000 },
  "poulet-citron-herbes": { "Blanc de poulet": 200_000, "Citron jaune": 30_000, "Herbes fraîches (menthe, persil)": 15_000, "Mélange de salades fraîches": 50_000 },
  "dorade-grillee": { "Filet de dorade": 180_000, "Citron jaune": 25_000, "Mélange de salades fraîches": 60_000, Tomates: 50_000 },
  "brochettes-boeuf": { "Bœuf maigre (filet)": 180_000, Tomates: 60_000, Concombres: 40_000, "Herbes fraîches (menthe, persil)": 10_000 },
  "mini-burgers-poulet": { "Blanc de poulet": 120_000, "Pain complet burger": 100_000, Tomates: 40_000, "Mélange de salades fraîches": 30_000 },
  "wrap-dinde-enfants": { "Escalope de dinde": 90_000, Tomates: 40_000, Concombres: 30_000, "Mélange de salades fraîches": 30_000 },
  "jus-detox-vert": { "Épinards frais": 80_000, "Concombre pressé": 150_000, "Pomme verte": 60_000, Céleri: 40_000, "Citron jaune": 15_000 },
  "jus-carotte-orange": { "Concombre pressé": 120_000, "Citron jaune": 10_000, "Pomme verte": 40_000 },
};

async function main() {
  console.log("── Seed Bloc 3 — cuisine, stock, livreurs ──");

  // 1) Ingrédients — upsert idempotent
  for (const ing of INGREDIENTS) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { unit: ing.unit, alertThreshold: ing.alert, costMillimesPer1000: ing.costPer1000 },
      create: {
        name: ing.name,
        unit: ing.unit,
        stockQuantity: ing.stock,
        alertThreshold: ing.alert,
        costMillimesPer1000: ing.costPer1000,
      },
    });
  }
  console.log(`✔ ${INGREDIENTS.length} ingrédients (dont 1 sous le seuil d'alerte : Épinards frais)`);

  const ingredients = await prisma.ingredient.findMany();
  const ingByName = new Map(ingredients.map((i) => [i.name, i]));

  // 2) Recettes — upsert idempotent par (produit, ingrédient)
  let lines = 0;
  for (const [productSlug, recipe] of Object.entries(RECIPES)) {
    const product = await prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product) {
      console.warn(`⚠ Produit introuvable pour la recette : ${productSlug}`);
      continue;
    }
    for (const [ingName, qty] of Object.entries(recipe)) {
      const ingredient = ingByName.get(ingName);
      if (!ingredient) {
        console.warn(`⚠ Ingrédient introuvable : ${ingName}`);
        continue;
      }
      const existing = await prisma.recipeLine.findUnique({
        where: { productId_ingredientId: { productId: product.id, ingredientId: ingredient.id } },
      });
      if (existing) {
        await prisma.recipeLine.update({ where: { id: existing.id }, data: { quantityPerServing: qty } });
      } else {
        await prisma.recipeLine.create({
          data: { productId: product.id, ingredientId: ingredient.id, quantityPerServing: qty },
        });
      }
      lines++;
    }
  }
  console.log(`✔ ${lines} lignes de recette reliées aux produits`);

  // 3) Livreurs — disponibilité identifiable (CDC #160)
  const drivers = [
    { name: "Karim Ben Salah", phone: "0021698111222", isActive: true, note: "Livreur de démonstration (scooter)" },
    { name: "Amine Trabelsi", phone: "0021698333444", isActive: true, note: null },
    { name: "Sami Gharbi", phone: "0021698555666", isActive: false, note: "En congé — désactivé (CDC #31)" },
  ];
  for (const d of drivers) {
    await prisma.driver.upsert({ where: { phone: d.phone }, update: { name: d.name, isActive: d.isActive, note: d.note }, create: d });
  }
  console.log("✔ 3 livreurs (2 actifs, 1 désactivé)");

  // 4) PIN staff — mesure transitoire jusqu'à l'authentification complète du Bloc 4
  //    (vérification systématique côté serveur — le READ ONLY n'est jamais
  //    seulement visuel, CDC #54 / #142)
  const pins = [
    { key: "staff_pin_kitchen", value: "2468" },
    { key: "staff_pin_driver", value: "1357" },
  ];
  for (const p of pins) {
    await prisma.setting.upsert({ where: { key: p.key }, update: {}, create: p });
  }
  console.log("✔ PIN staff configurés (transitoire — auth complète au Bloc 4)");

  // 5) Commande de démonstration BEB-1047 : affectation livreur + positions GPS de démo
  //    pour tester la carte client en conditions réelles d'affichage.
  const demo = await prisma.order.findUnique({ where: { number: "BEB-1047" } });
  if (demo) {
    const demoDriver = await prisma.driver.findUnique({ where: { phone: "0021698111222" } });
    if (!demoDriver) throw new Error("Livreur de démo introuvable");

    await prisma.order.update({
      where: { id: demo.id },
      data: { driverId: demoDriver.id, addressLat: 36.8065, addressLng: 10.1815 }, // Tunis centre (démo)
    });

    const existingDemoPositions = await prisma.driverLocation.count({
      where: { orderId: demo.id },
    });
    if (existingDemoPositions === 0) {
      // Trajet de démonstration : approche progressive de la destination (Tunis centre)
      const now = Date.now();
      const demoTrack = [
        { lat: 36.7942, lng: 10.1718, agoMs: 60_000 },  // il y a 1 min
        { lat: 36.7989, lng: 10.1755, agoMs: 50_000 },
        { lat: 36.8014, lng: 10.1779, agoMs: 40_000 },
        { lat: 36.8038, lng: 10.1795, agoMs: 30_000 },
        { lat: 36.8051, lng: 10.1806, agoMs: 20_000 },
      ];
      for (const p of demoTrack) {
        await prisma.driverLocation.create({
          data: {
            driverId: demoDriver.id,
            orderId: demo.id,
            lat: p.lat,
            lng: p.lng,
            recordedAt: new Date(now - p.agoMs),
          },
        });
      }
      await prisma.orderEvent.create({
        data: {
          orderId: demo.id,
          type: "note",
          note: "Commande de démonstration : positions GPS de démo affectées au livreur Karim B.",
        },
      });
      console.log("✔ BEB-1047 : livreur affecté + 5 positions GPS de démonstration");
    } else {
      console.log("ℹ BEB-1047 : positions de démonstration déjà présentes");
    }
  } else {
    console.warn("⚠ Commande de démonstration BEB-1047 absente — lancer d'abord seed-bloc2");
  }

  console.log("── Seed Bloc 3 terminé ──");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
