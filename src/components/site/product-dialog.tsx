"use client";

// Configurateur produit — fenêtre unique pour « Commander » et « Personnaliser »
// (CDC #11 : deux actions distinctes, un seul système de personnalisation #11.3).
// Affiche les options autorisées, les suppléments payants, recalcule le prix en
// direct (CDC #11.1 / #12) et alimente le panier (CDC #13).
import Image from "next/image";
import { useState } from "react";
import { Flame, Drumstick, Wheat, Droplets, AlertTriangle, Clock, Leaf, Minus, Plus, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { formatTND } from "@/lib/format";
import type { CartOption } from "@/lib/cart";
import type { ProductView } from "@/components/site/types";

export type ProductDialogMode = "order" | "customize";

interface ProductDialogProps {
  product: ProductView | null;
  mode: ProductDialogMode;
  onClose: () => void;
  onAdd: (payload: {
    productId: string;
    name: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    options: CartOption[];
  }, mode: ProductDialogMode) => void;
}

export function ProductDialog({ product, mode, onClose, onAdd }: ProductDialogProps) {
  const [preview, setPreview] = useState<ProductView | null>(null);

  // Garde la dernière version du produit pendant l'animation de fermeture
  // (dérivation d'état pendant le rendu — pattern React officiel)
  if (product !== null && product !== preview) {
    setPreview(product);
  }

  const p = preview;
  const availableOptions = (p?.options ?? []).filter((o) => o.isAvailable);

  // Sélections : quantité choisie par option (0 = non sélectionnée)
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [lastOpenId, setLastOpenId] = useState<string | null>(null);

  // Réinitialisation à l'ouverture d'un produit
  // (dérivation d'état pendant le rendu — pattern React officiel)
  if (product !== null && product.id !== lastOpenId) {
    setLastOpenId(product.id);
    setSelections({});
    setQuantity(1);
  }

  const unitPriceWithOptions =
    (p?.price ?? 0) +
    availableOptions.reduce((sum, o) => sum + (selections[o.id] ?? 0) * o.priceAdjustment, 0);
  const lineTotal = unitPriceWithOptions * quantity;

  const setOptionQty = (optionId: string, qty: number, max: number) => {
    setSelections((prev) => ({ ...prev, [optionId]: Math.min(Math.max(0, qty), max) }));
  };

  const handleAdd = () => {
    if (!p) return;
    const options: CartOption[] = availableOptions
      .filter((o) => (selections[o.id] ?? 0) > 0)
      .map((o) => ({
        optionId: o.id,
        name: o.name,
        priceAdjustment: o.priceAdjustment,
        quantity: selections[o.id],
      }));
    onAdd(
      {
        productId: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        unitPrice: p.price,
        quantity,
        options,
      },
      mode,
    );
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      {p && (
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl p-0 sm:max-w-lg scrollbar-slim">
          <div className="relative aspect-[16/9] w-full">
            {p.imageUrl && (
              <Image
                src={p.imageUrl}
                alt={p.name}
                fill
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
                priority
              />
            )}
          </div>

          <div className="px-6 pb-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-extrabold tracking-tight">{p.name}</DialogTitle>
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Clock className="h-3 w-3" aria-hidden />
                  {p.prepMinutes} min
                </Badge>
                {!p.isAvailable && (
                  <Badge className="rounded-full bg-destructive text-white">Indisponible</Badge>
                )}
              </div>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </DialogDescription>
            </DialogHeader>

            {/* ── Personnalisation — même système pour les deux parcours (#11.3) ── */}
            {availableOptions.length > 0 && (
              <section className="mt-4" aria-labelledby="options-title">
                <h4 id="options-title" className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" aria-hidden />
                  {mode === "customize" ? "Personnalisez votre plat" : "Options disponibles"}
                </h4>
                <p className="mb-3 text-xs text-muted-foreground">
                  Suppléments ajoutés au prix de base, recalculés en direct.
                </p>
                <ul className="space-y-2">
                  {availableOptions.map((o) => {
                    const qty = selections[o.id] ?? 0;
                    return (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{o.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.priceAdjustment > 0 ? `+ ${formatTND(o.priceAdjustment)}` : "Inclus"}
                            {o.maxQuantity > 1 ? ` · max ${o.maxQuantity}` : ""}
                          </p>
                        </div>
                        {o.maxQuantity === 1 ? (
                          <Checkbox
                            checked={qty === 1}
                            onCheckedChange={(checked) => setOptionQty(o.id, checked ? 1 : 0, o.maxQuantity)}
                            aria-label={`Ajouter ${o.name}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5" aria-label={`Quantité ${o.name}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              disabled={qty === 0}
                              onClick={() => setOptionQty(o.id, qty - 1, o.maxQuantity)}
                              aria-label={`Retirer une unité de ${o.name}`}
                            >
                              <Minus className="h-3 w-3" aria-hidden />
                            </Button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              disabled={qty >= o.maxQuantity}
                              onClick={() => setOptionQty(o.id, qty + 1, o.maxQuantity)}
                              aria-label={`Ajouter une unité de ${o.name}`}
                            >
                              <Plus className="h-3 w-3" aria-hidden />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <Separator className="my-4" />

            {p.composition.length > 0 && (
              <section aria-labelledby="composition-title">
                <h4 id="composition-title" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Leaf className="h-4 w-4 text-primary" aria-hidden />
                  Composition
                </h4>
                <ul className="flex flex-wrap gap-1.5">
                  {p.composition.map((item) => (
                    <li key={item}>
                      <Badge variant="outline" className="rounded-full font-normal text-foreground/80">
                        {item}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.nutrition && (
              <section className="mt-4" aria-labelledby="nutrition-title">
                <h4 id="nutrition-title" className="mb-2 text-sm font-bold text-foreground">
                  Valeurs nutritionnelles (par portion)
                </h4>
                <dl className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Flame, label: "Calories", value: `${p.nutrition.calories} kcal` },
                    { icon: Drumstick, label: "Protéines", value: `${p.nutrition.protein} g` },
                    { icon: Wheat, label: "Glucides", value: `${p.nutrition.carbs} g` },
                    { icon: Droplets, label: "Lipides", value: `${p.nutrition.fat} g` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl bg-secondary/70 p-2.5 text-center">
                      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" aria-hidden />
                      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
                      <dd className="text-sm font-bold text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {p.allergens.length > 0 && (
              <section className="mt-4" aria-labelledby="allergenes-title">
                <h4 id="allergenes-title" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                  Allergènes présents
                </h4>
                <p className="text-sm text-muted-foreground">{p.allergens.join(" · ")}</p>
              </section>
            )}

            {/* ── Quantité + prix recalculé + ajout au panier (CDC #11.1 étapes 5–6) ── */}
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 p-3">
              <div className="flex items-center gap-2" aria-label="Quantité du produit">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-card"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                  aria-label="Retirer un produit"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </Button>
                <span className="w-6 text-center text-base font-extrabold tabular-nums">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-card"
                  disabled={quantity >= 20}
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Ajouter un produit"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <p className="text-lg font-extrabold text-primary tabular-nums">{formatTND(lineTotal)}</p>
            </div>

            <Button
              className="mt-4 h-12 w-full rounded-full text-base font-bold shadow-sm"
              disabled={!p.isAvailable}
              onClick={handleAdd}
            >
              Ajouter au panier · {formatTND(lineTotal)}
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
