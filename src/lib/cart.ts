// Panier — règles CDC #13
// Le panier conserve produits, quantités et personnalisations, recalcule les
// montants, distingue deux produits identiques avec des personnalisations
// différentes et conserve les informations nécessaires à la commande finale.

export interface CartOption {
  optionId: string;
  name: string;
  priceAdjustment: number; // millimes
  quantity: number;
}

export interface CartItem {
  key: string; // signature : produit + personnalisations (CDC #13 — distinction)
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number; // millimes — prix de base
  quantity: number;
  options: CartOption[];
}

export interface CartTotals {
  productsTotal: number;
  customizationsTotal: number; // options incluses (montant 0) — structure CDC #66
  supplementsTotal: number; // suppléments payants — CDC #66
  itemCount: number;
}

// Signature stable : identifiant produit + options triées avec quantités
export function cartItemSignature(productId: string, options: CartOption[]): string {
  const opts = [...options]
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((o) => `${o.optionId}:${o.quantity}`)
    .join("|");
  return `${productId}__${opts}`;
}

// Ligne : (prix de base + Σ supplément × quantité option) × quantité produit
export function computeLineTotal(item: CartItem): number {
  const optionsTotal = item.options.reduce((sum, o) => sum + o.priceAdjustment * o.quantity, 0);
  return (item.unitPrice + optionsTotal) * item.quantity;
}

// Décomposition CDC #66 : produits / personnalisations / suppléments
export function computeTotals(items: CartItem[]): CartTotals {
  let productsTotal = 0;
  let customizationsTotal = 0;
  let supplementsTotal = 0;
  let itemCount = 0;

  for (const item of items) {
    productsTotal += item.unitPrice * item.quantity;
    itemCount += item.quantity;
    for (const opt of item.options) {
      const money = opt.priceAdjustment * opt.quantity * item.quantity;
      if (opt.priceAdjustment > 0) {
        supplementsTotal += money;
      } else {
        customizationsTotal += money; // options gratuites (0 DT) tracées séparément
      }
    }
  }
  return { productsTotal, customizationsTotal, supplementsTotal, itemCount };
}
