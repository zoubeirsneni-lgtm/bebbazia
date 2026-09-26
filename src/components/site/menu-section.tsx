"use client";

import { useMemo, useState } from "react";
import { Salad, Flame, Baby, GlassWater, CalendarCheck, LayoutGrid, Leaf } from "lucide-react";
import { ProductCard } from "@/components/site/product-card";
import { ProductDialog, type ProductDialogMode } from "@/components/site/product-dialog";
import type { CategoryView, ProductView } from "@/components/site/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Salad, Flame, Baby, GlassWater, CalendarCheck,
};

interface MenuSectionProps {
  categories: CategoryView[];
  products: ProductView[];
  onOpenProduct: (product: ProductView, mode: ProductDialogMode) => void;
}

export function MenuSection({ categories, products, onOpenProduct }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visibleProducts = useMemo(
    () =>
      activeCategory
        ? products.filter((p) => p.categoryId === activeCategory)
        : products,
    [products, activeCategory],
  );

  return (
    <section id="menu" className="scroll-mt-20" aria-labelledby="menu-title">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16" id="categories">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Notre carte</p>
          <h2 id="menu-title" className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Un menu pensé pour votre santé
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-muted-foreground">
            Choisissez une catégorie, puis commandez ou personnalisez chaque plat selon
            vos envies : suppléments de protéines, légumes en plus, options adaptées.
          </p>
        </div>

        {/* Filtres catégories */}
        <div
          className="scrollbar-slim mt-8 flex gap-2.5 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible"
          role="tablist"
          aria-label="Filtrer les produits par catégorie"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${
              activeCategory === null
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-secondary"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Tout le menu
          </button>
          {categories.map((cat) => {
            const Icon = cat.icon ? ICONS[cat.icon] ?? Leaf : Leaf;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(active ? null : cat.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Grille produits */}
        {visibleProducts.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            Aucun plat dans cette catégorie pour le moment.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={(mode) => onOpenProduct(product, mode)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
