// BEBBA Healthy Food — Moteur de stock (CDC #10, #22, #23, #25, #26, #27)
// Quantités en milli-unités entières (1 g = 1000) : aucune conversion
// implicite, aucune perte de précision (CDC #26).

import { db } from "@/lib/db";
import type { OrderItem } from "@prisma/client";

export const CONSUMPTION = "consumption";

export interface IngredientNeed {
  ingredientId: string;
  name: string;
  unit: string;
  quantityMilliUnits: number; // total requis pour la commande (positif)
}

export interface StockAlert {
  ingredientId: string;
  name: string;
  unit: string;
  stockQuantity: number;
  alertThreshold: number;
  level: "below_threshold" | "negative";
}

/**
 * Calcule les besoins d'une commande à partir des recettes des produits
 * commandés (CDC #27). Retourne aussi les produits sans recette — ils sont
 * listés mais ne consomment rien (recette non renseignée = comportement
 * explicite, jamais de consommation approximée).
 */
export async function computeOrderNeeds(orderId: string): Promise<{
  needs: IngredientNeed[];
  productsWithoutRecipe: string[];
}> {
  const items = await db.orderItem.findMany({ where: { orderId } });
  if (items.length === 0) return { needs: [], productsWithoutRecipe: [] };

  const productIds = [...new Set(items.map((i) => i.productId))];
  const recipes = await db.recipeLine.findMany({
    where: { productId: { in: productIds } },
    include: { ingredient: true },
  });

  const productsWithoutRecipe: string[] = [];
  const covered = new Set(recipes.map((r) => r.productId));
  const itemsByProduct = new Map<string, OrderItem[]>();
  for (const item of items) {
    const list = itemsByProduct.get(item.productId) ?? [];
    list.push(item);
    itemsByProduct.set(item.productId, list);
  }
  for (const [productId, list] of itemsByProduct) {
    if (!covered.has(productId)) {
      productsWithoutRecipe.push(list[0].productName);
    }
  }

  // Agrégation des besoins par ingrédient : Σ (quantité par portion × quantité commandée)
  const needByIngredient = new Map<string, number>();
  const ingredientInfo = new Map<string, { name: string; unit: string }>();
  for (const recipe of recipes) {
    const list = itemsByProduct.get(recipe.productId);
    if (!list) continue;
    const orderedQty = list.reduce((sum, item) => sum + item.quantity, 0);
    const total = recipe.quantityPerServing * orderedQty;
    needByIngredient.set(
      recipe.ingredientId,
      (needByIngredient.get(recipe.ingredientId) ?? 0) + total,
    );
    ingredientInfo.set(recipe.ingredientId, { name: recipe.ingredient.name, unit: recipe.ingredient.unit });
  }

  const needs: IngredientNeed[] = [...needByIngredient.entries()]
    .map(([ingredientId, quantityMilliUnits]) => ({
      ingredientId,
      quantityMilliUnits,
      name: ingredientInfo.get(ingredientId)!.name,
      unit: ingredientInfo.get(ingredientId)!.unit,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { needs, productsWithoutRecipe };
}

/** Formate une quantité en milli-unités vers une chaîne lisible (ex: 150000 → "150 g"). */
export function formatMilliQuantity(milli: number, unit: string): string {
  const abs = Math.abs(milli);
  const value = abs / 1000;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} ${unit}`;
}
