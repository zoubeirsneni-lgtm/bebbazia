"use client";

// Panier — CDC #13 : conserve produits, quantités et personnalisations, recalcule
// les montants, affiche les suppléments, permet modification et suppression.
// Deux produits identiques avec des personnalisations différentes sont des lignes distinctes.
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatTND } from "@/lib/format";
import { computeLineTotal, computeTotals } from "@/lib/cart";
import { useCartStore } from "@/lib/cart-store";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

export function CartSheet({ open, onOpenChange, onCheckout }: CartSheetProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const totals = computeTotals(items);
  const provisionalDelivery = 0; // frais de livraison réels à l'étape checkout (zone provisoire)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b border-border/60 p-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg font-extrabold">
            <ShoppingBag className="h-5 w-5 text-primary" aria-hidden />
            Mon panier
            {totals.itemCount > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {totals.itemCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Vérifiez vos plats et personnalisations avant de confirmer.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40" aria-hidden />
            <p className="font-semibold text-foreground">Votre panier est vide</p>
            <p className="text-sm text-muted-foreground">
              Parcourez le menu et ajoutez vos plats santé préférés.
            </p>
            <Button variant="outline" className="mt-2 rounded-full" onClick={() => onOpenChange(false)}>
              Découvrir le menu
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto p-5 scrollbar-slim">
              {items.map((item) => (
                <li key={item.key} className="rounded-2xl border border-border/70 bg-card p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {item.imageUrl && (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-snug text-foreground">{item.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Retirer ${item.name} du panier`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      {item.options.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {item.options.map((o) => (
                            <li key={o.optionId} className="flex justify-between gap-2 text-xs text-muted-foreground">
                              <span className="truncate">
                                {o.quantity > 1 ? `${o.quantity}× ` : ""}
                                {o.name}
                              </span>
                              <span className="shrink-0 font-medium tabular-nums">
                                {o.priceAdjustment > 0 ? `+ ${formatTND(o.priceAdjustment * o.quantity)}` : "Inclus"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5" aria-label={`Quantité ${item.name}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="h-3 w-3" aria-hidden />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="h-3 w-3" aria-hidden />
                          </Button>
                        </div>
                        <p className="text-sm font-extrabold text-primary tabular-nums">
                          {formatTND(computeLineTotal(item))}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border/60 bg-background p-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Produits</dt>
                  <dd className="font-semibold tabular-nums">{formatTND(totals.productsTotal)}</dd>
                </div>
                {totals.supplementsTotal > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Suppléments</dt>
                    <dd className="font-semibold tabular-nums">{formatTND(totals.supplementsTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Livraison</dt>
                  <dd className="font-semibold tabular-nums">
                    {provisionalDelivery === 0 ? (
                      <span className="text-xs font-normal text-muted-foreground">calculée à l&apos;étape suivante</span>
                    ) : (
                      formatTND(provisionalDelivery)
                    )}
                  </dd>
                </div>
              </dl>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Sous-total</span>
                <span className="text-lg font-extrabold text-primary tabular-nums">
                  {formatTND(totals.productsTotal + totals.customizationsTotal + totals.supplementsTotal)}
                </span>
              </div>
              <Button
                className="mt-4 h-12 w-full rounded-full text-base font-bold"
                onClick={onCheckout}
              >
                Passer la commande
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
