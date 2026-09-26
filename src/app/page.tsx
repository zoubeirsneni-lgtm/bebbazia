import { Suspense } from "react";
import { db } from "@/lib/db";
import { AppShell } from "@/components/site/app-shell";
import { safeParseJSON } from "@/lib/format";
import type { CategoryView, DeliveryZoneView, ProductView } from "@/components/site/types";

// Vitrine dynamique : le catalogue évolue via l'administration (CDC #9/#10)
export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, products, zones, settings] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
    db.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.setting.findMany(),
  ]);

  const categoryViews: CategoryView[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
  }));

  const productViews: ProductView[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    isAvailable: p.isAvailable,
    composition: safeParseJSON<string[]>(p.composition, []),
    nutrition: safeParseJSON<ProductView["nutrition"]>(p.nutrition, null),
    allergens: safeParseJSON<string[]>(p.allergens, []),
    prepMinutes: p.prepMinutes,
    options: p.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceAdjustment: o.priceAdjustment,
      isAvailable: o.isAvailable,
      maxQuantity: o.maxQuantity,
    })),
  }));

  const zoneViews: DeliveryZoneView[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    description: z.description,
    feeMillimes: z.feeMillimes,
  }));

  const deliveryNote = settings.find((s) => s.key === "delivery_note")?.value ?? "";

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" aria-busy="true" />}>
      <AppShell
        categories={categoryViews}
        products={productViews}
        zones={zoneViews}
        deliveryNote={deliveryNote}
      />
    </Suspense>
  );
}
