// Types partagés de la vitrine BEBBA
export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

// Option de personnalisation (CDC #12) : disponibilité, supplément de prix,
// limite quantitative — un seul système pour Commander et Personnaliser (#11.3)
export interface ProductOptionView {
  id: string;
  name: string;
  priceAdjustment: number; // millimes
  isAvailable: boolean;
  maxQuantity: number;
}

export interface ProductView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number; // millimes TND
  imageUrl: string | null;
  categoryId: string;
  isAvailable: boolean;
  composition: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number } | null;
  allergens: string[];
  prepMinutes: number;
  options: ProductOptionView[];
}

export interface DeliveryZoneView {
  id: string;
  name: string;
  description: string | null;
  feeMillimes: number;
}
