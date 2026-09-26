// Seed Bloc 1 — BEBBA Healthy Food
// Catégories officielles du CDC #9 + menu initial de démonstration
// Prix en millimes TND (12 500 = 12,500 DT)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seed BEBBA — démarrage");

  // Reset catalogue
  await db.product.deleteMany();
  await db.category.deleteMany();

  const healthy = await db.category.create({
    data: {
      name: "Healthy", slug: "healthy", icon: "Salad", sortOrder: 1,
      description: "Bols équilibrés, salades composées et pokés riches en nutriments.",
    },
  });
  const grillades = await db.category.create({
    data: {
      name: "Grillades", slug: "grillades", icon: "Flame", sortOrder: 2,
      description: "Viandes et poissons grillés, sans friture, marinades aux herbes.",
    },
  });
  const enfants = await db.category.create({
    data: {
      name: "Enfants", slug: "enfants", icon: "Baby", sortOrder: 3,
      description: "Repas adaptés aux enfants : équilibrés, colorés et savoureux.",
    },
  });
  const detox = await db.category.create({
    data: {
      name: "Jus détox", slug: "jus-detox", icon: "GlassWater", sortOrder: 4,
      description: "Jus pressés à froid et détox naturels, sans sucres ajoutés.",
    },
  });
  const regime = await db.category.create({
    data: {
      name: "Régime complet 30 jours", slug: "regime-30-jours", icon: "CalendarCheck", sortOrder: 5,
      description: "Programme alimentaire complet de 30 jours, livré chaque jour.",
    },
  });

  const P = (p: {
    name: string; slug: string; price: number; categoryId: string;
    description: string; composition: string[]; nutrition: { calories: number; protein: number; carbs: number; fat: number };
    allergens?: string[]; imageUrl: string; sortOrder: number; prepMinutes?: number; isAvailable?: boolean;
  }) => db.product.create({
    data: {
      ...p,
      isAvailable: p.isAvailable ?? true,
      composition: JSON.stringify(p.composition),
      nutrition: JSON.stringify(p.nutrition),
      allergens: p.allergens ? JSON.stringify(p.allergens) : null,
    },
  });

  await P({
    name: "Bowl Quinoa Poulet Grillé", slug: "bowl-quinoa-poulet", price: 16500, categoryId: healthy.id,
    description: "Quinoa complet, poulet grillé mariné aux herbes, avocat, tomates cerises, concombre et sauce yaourt léger au citron.",
    composition: ["Quinoa complet", "Poulet grillé 120g", "Avocat", "Tomates cerises", "Concombre", "Sauce yaourt-citron"],
    nutrition: { calories: 520, protein: 38, carbs: 45, fat: 18 },
    allergens: ["Produits laitiers"],
    imageUrl: "/products/bowl-quinoa.svg", sortOrder: 1,
  });
  await P({
    name: "Salade Saumon Fumé & Épeautre", slug: "salade-saumon-epeautre", price: 18900, categoryId: healthy.id,
    description: "Épeautre tendre, saumon fumé, jeunes pousses d'épinards, radis, graines de courge et vinaigrette miel-moutarde.",
    composition: ["Épeautre", "Saumon fumé 90g", "Épinards frais", "Radis", "Graines de courge", "Vinaigrette miel-moutarde"],
    nutrition: { calories: 480, protein: 29, carbs: 40, fat: 22 },
    allergens: ["Poisson", "Moutarde"],
    imageUrl: "/products/salade-saumon.svg", sortOrder: 2,
  });
  await P({
    name: "Poké Bowl Végétarien", slug: "poke-vegetarien", price: 14900, categoryId: healthy.id,
    description: "Riz complet vinaigré, tofu mariné soja-sésame, edamame, mangue, carottes croquantes et chou rouge.",
    composition: ["Riz complet", "Tofu mariné 100g", "Edamame", "Mangue", "Carottes", "Chou rouge", "Sésame"],
    nutrition: { calories: 460, protein: 21, carbs: 58, fat: 15 },
    allergens: ["Soja", "Sésame"],
    imageUrl: "/products/poke-veggie.svg", sortOrder: 3,
  });
  await P({
    name: "Poulet Grillé Citron & Herbes", slug: "poulet-citron-herbes", price: 19500, categoryId: grillades.id,
    description: "Filet de poulet mariné au citron, romarin et thym, servi avec légumes rôtis de saison et patate douce au four.",
    composition: ["Filet de poulet 180g", "Citron", "Romarin, thym", "Légumes rôtis", "Patate douce"],
    nutrition: { calories: 540, protein: 42, carbs: 38, fat: 20 },
    imageUrl: "/products/poulet-grille.svg", sortOrder: 1,
  });
  await P({
    name: "Pavé de Dorade Grillée", slug: "dorade-grillee", price: 24500, categoryId: grillades.id,
    description: "Pavé de dorade grillé à la plancha, chermoula légère, semoule complète aux légumes et quartiers de citron.",
    composition: ["Dorade 200g", "Chermoula", "Semoule complète", "Légumes du marché", "Citron"],
    nutrition: { calories: 495, protein: 40, carbs: 35, fat: 19 },
    allergens: ["Poisson", "Gluten (traces)"],
    imageUrl: "/products/dorade.svg", sortOrder: 2,
  });
  await P({
    name: "Brochettes de Bœuf Maigre", slug: "brochettes-boeuf", price: 22000, categoryId: grillades.id,
    description: "Brochettes de bœuf maigre marinées à l'ail et paprika fumé, poivrons grillés et salade verte croquante.",
    composition: ["Bœuf maigre 160g", "Ail, paprika fumé", "Poivrons grillés", "Salade verte"],
    nutrition: { calories: 510, protein: 44, carbs: 18, fat: 26 },
    imageUrl: "/products/brochettes.svg", sortOrder: 3,
  });
  await P({
    name: "Mini Burgers au Poulet", slug: "mini-burgers-poulet", price: 13500, categoryId: enfants.id,
    description: "Deux mini burgers de poulet au pain complet, cheddar doux, tomate et bâtonnets de carotte.",
    composition: ["Pain complet", "Poulet haché 100g", "Cheddar doux", "Tomate", "Bâtonnets de carotte"],
    nutrition: { calories: 430, protein: 26, carbs: 42, fat: 16 },
    allergens: ["Gluten", "Produits laitiers"],
    imageUrl: "/products/mini-burgers.svg", sortOrder: 1,
  });
  await P({
    name: "Wrap Enfants Dinde & Légumes", slug: "wrap-dinde-enfants", price: 9900, categoryId: enfants.id,
    description: "Wrap de blé tendre garni de dinde effilochée, fromage frais, concombre et carottes râpées.",
    composition: ["Wrap blé", "Dinde 80g", "Fromage frais", "Concombre", "Carottes râpées"],
    nutrition: { calories: 380, protein: 24, carbs: 40, fat: 12 },
    allergens: ["Gluten", "Produits laitiers"],
    imageUrl: "/products/wrap-dinde.svg", sortOrder: 2,
  });
  await P({
    name: "Jus Détox Vert", slug: "jus-detox-vert", price: 6500, categoryId: detox.id,
    description: "Pomme verte, concombre, céleri, épinards, gingembre et citron pressé à froid. Sans sucres ajoutés.",
    composition: ["Pomme verte", "Concombre", "Céleri", "Épinards", "Gingembre", "Citron"],
    nutrition: { calories: 120, protein: 3, carbs: 26, fat: 1 },
    imageUrl: "/products/jus-vert.svg", sortOrder: 1, prepMinutes: 10,
  });
  await P({
    name: "Jus Carotte-Orange-Gingembre", slug: "jus-carotte-orange", price: 6000, categoryId: detox.id,
    description: "Carottes fraîches, orange pressée et touche de gingembre. Riche en vitamine C, pressé à la commande.",
    composition: ["Carottes", "Orange", "Gingembre"],
    nutrition: { calories: 140, protein: 3, carbs: 32, fat: 1 },
    imageUrl: "/products/jus-carotte.svg", sortOrder: 2, prepMinutes: 10,
  });
  await P({
    name: "Programme 30 Jours — Équilibre", slug: "programme-30j-equilibre", price: 890000, categoryId: regime.id,
    description: "30 jours de repas complets (déjeuner + dîner) élaborés par nos nutritionnistes. Livraison quotidienne incluse dans la zone de livraison.",
    composition: ["60 repas sur 30 jours", "Plan nutritionnel personnalisé", "Suivi hebdomadaire", "Livraison quotidienne"],
    nutrition: { calories: 1400, protein: 90, carbs: 140, fat: 45 },
    imageUrl: "/products/programme-30j.svg", sortOrder: 1, prepMinutes: 45,
  });
  await P({
    name: "Programme 30 Jours — Sportif", slug: "programme-30j-sportif", price: 990000, categoryId: regime.id,
    description: "Programme haute protéine sur 30 jours pour accompagner l'entraînement : déjeuner, dîner et collation protéinée quotidienne.",
    composition: ["90 repas et collations", "Riche en protéines (150g/jour)", "Plan adapté à l'entraînement", "Livraison quotidienne"],
    nutrition: { calories: 1900, protein: 150, carbs: 150, fat: 55 },
    imageUrl: "/products/programme-30j.svg", sortOrder: 2, prepMinutes: 45,
  });
  // Un produit indisponible pour vérifier le rendu du badge (CDC #79)
  await P({
    name: "Bowl Saumon Teriyaki", slug: "bowl-saumon-teriyaki", price: 19500, categoryId: healthy.id,
    description: "Saumon snacké sauce teriyaki allégée, riz complet, edamame et graines de sésame.",
    composition: ["Saumon 130g", "Sauce teriyaki allégée", "Riz complet", "Edamame", "Sésame"],
    nutrition: { calories: 530, protein: 34, carbs: 52, fat: 18 },
    allergens: ["Poisson", "Soja", "Sésame"],
    imageUrl: "/products/poke-veggie.svg", sortOrder: 4, isAvailable: false,
  });

  const counts = { categories: await db.category.count(), products: await db.product.count() };
  console.log(`✅ Seed terminé : ${counts.categories} catégories, ${counts.products} produits`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
