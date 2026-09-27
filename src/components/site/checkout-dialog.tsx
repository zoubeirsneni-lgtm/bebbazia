"use client";

// Checkout — commande invité (CDC #6) : téléphone + adresse obligatoires (#8),
// nom facultatif, identifiant normalisé 00 + indicatif + numéro (#7),
// décomposition du total (#66), paiement COD (#17), idempotence (#85).
import { useMemo, useRef, useState } from "react";
import { Banknote, Loader2, MapPin, Phone, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatTND } from "@/lib/format";
import { computeTotals } from "@/lib/cart";
import { useCartStore } from "@/lib/cart-store";
import { normalizePhone, displayPhone } from "@/lib/phone";
import type { OrderSummary } from "@/lib/order-types";
import type { DeliveryZoneView } from "@/components/site/types";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: DeliveryZoneView[];
  deliveryNote: string;
  onConfirmed: (order: OrderSummary) => void;
}

export function CheckoutDialog({ open, onOpenChange, zones, deliveryNote, onConfirmed }: CheckoutDialogProps) {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [zoneId, setZoneId] = useState<string>(zones[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clé d'idempotence régénérée à chaque nouvelle intention de commande (CDC #85)
  const idempotencyRef = useRef<string>("");

  const totals = useMemo(() => computeTotals(items), [items]);
  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const deliveryFee = zone?.feeMillimes ?? 0;
  const total = totals.productsTotal + totals.customizationsTotal + totals.supplementsTotal + deliveryFee;

  // Identifiant normalisé affiché en direct (CDC #7 — transparence)
  const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";

  const canSubmit =
    phone.trim().length >= 8 && address.trim().length >= 8 && items.length > 0 && !submitting;

  const handleSubmit = async () => {
    setError(null);
    if (!idempotencyRef.current) {
      idempotencyRef.current = crypto.randomUUID();
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyRef.current,
        },
        body: JSON.stringify({
          phone,
          name: name.trim() || null,
          address,
          addressNotes: addressNotes.trim() || null,
          zoneId: zoneId || null,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            options: i.options.map((o) => ({ optionId: o.optionId, quantity: o.quantity })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de créer la commande. Merci de réessayer.");
        // Une erreur métier (panier refusé) permet une nouvelle tentative propre
        idempotencyRef.current = "";
        return;
      }
      // Succès : panier vidé, nouvelle clé pour la prochaine commande
      clearCart();
      idempotencyRef.current = "";
      onConfirmed(data.order as OrderSummary);
    } catch {
      setError("Erreur réseau : vérifiez votre connexion puis réessayez.");
      idempotencyRef.current = "";
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl p-0 scrollbar-slim sm:max-w-lg">
        <div className="p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-extrabold">Finaliser ma commande</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Paiement à la livraison — aucune création de compte nécessaire.
            </DialogDescription>
          </DialogHeader>

          {/* ── Coordonnées (CDC #7 / #8) ── */}
          <section className="mt-5 space-y-4" aria-labelledby="checkout-contact">
            <h3 id="checkout-contact" className="text-sm font-bold text-foreground">Vos coordonnées</h3>
            <div className="space-y-1.5">
              <Label htmlFor="checkout-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" aria-hidden />
                Téléphone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="checkout-phone"
                type="tel"
                inputMode="tel"
                placeholder="+216 98 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="rounded-xl"
              />
              {normalizedPhone && (
                <p className="text-xs text-muted-foreground">
                  Identifiant de suivi : <span className="font-semibold text-foreground">{normalizedPhone}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout-name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" aria-hidden />
                Nom <span className="text-xs font-normal text-muted-foreground">(facultatif)</span>
              </Label>
              <Input
                id="checkout-name"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="rounded-xl"
              />
            </div>
          </section>

          {/* ── Livraison (CDC #8 / #47 / #150) ── */}
          <section className="mt-5 space-y-4" aria-labelledby="checkout-delivery">
            <h3 id="checkout-delivery" className="text-sm font-bold text-foreground">Livraison</h3>
            {zones.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="checkout-zone">Zone de livraison</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger id="checkout-zone" className="w-full rounded-xl">
                    <SelectValue placeholder="Choisir une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name} · {z.feeMillimes > 0 ? formatTND(z.feeMillimes) : "gratuit (provisoire)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {deliveryNote && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">{deliveryNote}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="checkout-address" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                Adresse complète <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="checkout-address"
                placeholder="Rue, immeuble, étage, ville…"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout-notes" className="text-sm">
                Instructions pour le livreur <span className="text-xs font-normal text-muted-foreground">(facultatif)</span>
              </Label>
              <Input
                id="checkout-notes"
                placeholder="Code portail, sonnerie…"
                value={addressNotes}
                onChange={(e) => setAddressNotes(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </section>

          {/* ── Récapitulatif — décomposition CDC #66 ── */}
          <section className="mt-5" aria-labelledby="checkout-total">
            <h3 id="checkout-total" className="mb-2 text-sm font-bold text-foreground">Récapitulatif</h3>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
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
                  <dt className="text-muted-foreground">Personnalisations</dt>
                  <dd className="font-semibold tabular-nums">{formatTND(totals.customizationsTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Livraison</dt>
                  <dd className="font-semibold tabular-nums">{formatTND(deliveryFee)}</dd>
                </div>
              </dl>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <span className="font-bold">Total à payer</span>
                <span className="text-xl font-extrabold text-primary tabular-nums">{formatTND(total)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/70 p-3">
                <Banknote className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="text-xs leading-snug text-secondary-foreground">
                  Paiement à la livraison en espèces — préparez <strong>{formatTND(total)}</strong>.
                </p>
              </div>
            </div>
          </section>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full font-semibold"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Retour
            </Button>
            <Button className="h-11 flex-1 rounded-full font-bold" disabled={!canSubmit} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Création…
                </>
              ) : (
                `Confirmer · ${formatTND(total)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
