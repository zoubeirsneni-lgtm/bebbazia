"use client";

// Confirmation de commande : numéro officiel (CDC #19), trackingToken 8
// caractères (CDC #20) conservé dans la clé locale `bebba_last_tracking_token`.
import { useState } from "react";
import { CheckCircle2, Copy, MapPinned, PackageCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatTND } from "@/lib/format";
import { LAST_TRACKING_TOKEN_KEY } from "@/lib/order-state";
import type { OrderSummary } from "@/lib/order-types";

interface ConfirmationDialogProps {
  order: OrderSummary | null;
  onOpenChange: (open: boolean) => void;
  onTrack: (token: string) => void;
}

export function ConfirmationDialog({ order, onOpenChange, onTrack }: ConfirmationDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Le presse-papier peut être indisponible : le token reste affiché
    }
  };

  const handleTrack = () => {
    // Clé locale de référence définie par le CDC #20
    try {
      localStorage.setItem(LAST_TRACKING_TOKEN_KEY, order.trackingToken);
    } catch {
      // Stockage indisponible : le suivi reste possible via le token affiché
    }
    onTrack(order.trackingToken);
  };

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="space-y-3 text-center sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <DialogTitle className="text-xl font-extrabold">Commande confirmée !</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Votre commande est enregistrée. Conservez le code de suivi ci-dessous pour
            suivre sa préparation et sa livraison en temps réel.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Numéro de commande</p>
              <p className="text-lg font-extrabold text-foreground">{order.number}</p>
            </div>
            <PackageCheck className="h-6 w-6 text-primary" aria-hidden />
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code de suivi</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="font-mono text-xl font-extrabold tracking-[0.2em] text-primary">
                {order.trackingToken}
              </p>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full bg-card"
                onClick={copyToken}
                aria-label="Copier le code de suivi"
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {copied && <p className="mt-1 text-xs text-primary">Code copié !</p>}
          </div>

          <div className="rounded-2xl bg-secondary/70 p-4 text-sm">
            <p className="text-secondary-foreground">
              Montant à préparer en espèces à la livraison :{" "}
              <strong className="text-foreground">{formatTND(order.amountToCollect)}</strong>
            </p>
          </div>

          <Button className="h-12 w-full rounded-full text-base font-bold" onClick={handleTrack}>
            <MapPinned className="h-5 w-5" aria-hidden />
            Suivre ma commande
          </Button>
          <Button variant="ghost" className="w-full rounded-full" onClick={() => onOpenChange(false)}>
            Retour au menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
