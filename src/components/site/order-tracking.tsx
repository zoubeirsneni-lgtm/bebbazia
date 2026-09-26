"use client";

// Suivi de commande client — CDC #20 : token de 8 caractères, `?token=` est
// prioritaire, clé locale `bebba_last_tracking_token`. Rafraîchissement
// automatique (polling 15 s) tant que la commande est en cours.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Banknote, CheckCircle2, ClipboardList, ChefHat, PackageCheck,
  Bike, RefreshCw, Search, ReceiptText, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatTND } from "@/lib/format";
import {
  STATUS_LABELS_FR, PAYMENT_LABELS_FR, LAST_TRACKING_TOKEN_KEY,
  DEMO_TRACKING_TOKEN, isOrderStatus, isPaymentStatusSafe, type TrackOrder,
} from "@/lib/track-types";
import type { OrderStatus } from "@/lib/order-state";

// Icône par étape de la machine d'état (CDC #16)
const STATUS_ICONS: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  received: ClipboardList,
  preparing: ChefHat,
  ready: PackageCheck,
  waiting_for_driver: Timer,
  delivering: Bike,
  delivered: CheckCircle2,
  cancelled: RefreshCw,
};

const ACTIVE_POLL_MS = 15_000;

interface OrderTrackingProps {
  initialToken: string | null; // `?token=` prioritaire (CDC #20)
  onBack: () => void;
}

export function OrderTracking({ initialToken, onBack }: OrderTrackingProps) {
  const [input, setInput] = useState(initialToken ?? "");
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<string | null>(null);

  const lookup = useCallback(async (token: string, silent = false) => {
    const clean = token.trim();
    if (!clean) {
      setError("Saisissez votre code de suivi.");
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/track?token=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOrder(null);
        setError(data.error ?? "Suivi indisponible pour le moment.");
        return;
      }
      setOrder(data.order as TrackOrder);
      searchRef.current = clean;
      try {
        localStorage.setItem(LAST_TRACKING_TOKEN_KEY, clean);
      } catch {
        // stockage indisponible : suivi toujours possible en session
      }
    } catch {
      if (!silent) {
        setOrder(null);
        setError("Erreur réseau : vérifiez votre connexion puis réessayez.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Recherche initiale : `?token=` prioritaire, sinon dernière commande suivie
  useEffect(() => {
    if (initialToken) {
      lookup(initialToken);
      return;
    }
    try {
      const last = localStorage.getItem(LAST_TRACKING_TOKEN_KEY);
      if (last) {
        setInput(last);
        lookup(last);
      }
    } catch {
      // pas de stockage : saisie manuelle
    }
  }, [initialToken, lookup]);

  // Polling tant que la commande n'est ni livrée ni annulée
  useEffect(() => {
    if (!order || !searchRef.current) return;
    if (order.status === "delivered" || order.status === "cancelled") return;
    const id = setInterval(() => lookup(searchRef.current!, true), ACTIVE_POLL_MS);
    return () => clearInterval(id);
  }, [order, lookup]);

  const currentStatus = order && isOrderStatus(order.status) ? order.status : null;
  const paymentLabel = order && isPaymentStatusSafe(order.paymentStatus)
    ? PAYMENT_LABELS_FR[order.paymentStatus]
    : order?.paymentStatus;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6" aria-labelledby="tracking-title">
      <Button variant="ghost" className="-ml-2 mb-4 rounded-full" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au menu
      </Button>

      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Suivi en temps réel</p>
        <h1 id="tracking-title" className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          Où est ma commande ?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Saisissez le code de suivi à 8 caractères reçu lors de votre commande.
        </p>
      </div>

      {/* Recherche par token (CDC #20) */}
      <form
        className="mx-auto mt-6 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Ex. A7K2M9QX"
          maxLength={20}
          className="h-12 rounded-full text-center font-mono text-lg font-bold tracking-[0.25em]"
          aria-label="Code de suivi"
          autoComplete="off"
        />
        <Button type="submit" size="lg" className="h-12 rounded-full px-5 font-bold" disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          Suivre
        </Button>
      </form>
      <p className="mt-3 text-center">
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            setInput(DEMO_TRACKING_TOKEN);
            lookup(DEMO_TRACKING_TOKEN);
          }}
        >
          Tester avec la commande de démonstration
        </button>
      </p>

      {error && (
        <Alert variant="destructive" className="mx-auto mt-6 max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !order && (
        <div className="mx-auto mt-8 max-w-md space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {order && (
        <div className="mt-8 space-y-5">
          {/* En-tête commande */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Commande</p>
              <p className="text-xl font-extrabold text-foreground">{order.number}</p>
            </div>
            <Badge
              className={
                currentStatus === "delivered"
                  ? "rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground"
                  : currentStatus === "cancelled"
                    ? "rounded-full bg-destructive px-4 py-1.5 text-sm text-white"
                    : "rounded-full bg-amber-500 px-4 py-1.5 text-sm text-white"
              }
            >
              {currentStatus ? STATUS_LABELS_FR[currentStatus] : order.status}
            </Badge>
          </div>

          {/* Chronologie — machine d'état CDC #14/#16 */}
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h2 className="mb-4 text-sm font-bold text-foreground">Progression</h2>
            <ol className="relative space-y-4 border-l border-border/70 pl-6">
              {order.events
                .filter((e) => e.toStatus && isOrderStatus(e.toStatus))
                .map((e, idx) => {
                  const st = e.toStatus as OrderStatus;
                  const Icon = STATUS_ICONS[st];
                  const isCurrent = idx === order.events.filter((ev) => ev.toStatus && isOrderStatus(ev.toStatus)).length - 1;
                  return (
                    <li key={`${e.createdAt}-${idx}`} className="relative">
                      <span
                        className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ${
                          isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className={`text-sm font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                        {STATUS_LABELS_FR[st]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </li>
                  );
                })}
            </ol>
          </div>

          {/* Détail + montants (décomposition CDC #66, COD CDC #17) */}
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <ReceiptText className="h-4 w-4 text-primary" aria-hidden />
              Détail de la commande
            </h2>
            <ul className="space-y-2">
              {order.items.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {item.quantity}× {item.productName}
                    </p>
                    {item.options.length > 0 && (
                      <ul className="mt-0.5 text-xs text-muted-foreground">
                        {item.options.map((o) => (
                          <li key={o.optionId}>
                            {o.quantity > 1 ? `${o.quantity}× ` : ""}
                            {o.name}
                            {o.priceAdjustment > 0 ? ` (+ ${formatTND(o.priceAdjustment * o.quantity)})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{formatTND(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Produits</dt>
                <dd className="tabular-nums">{formatTND(order.totals.productsTotal)}</dd>
              </div>
              {order.totals.supplementsTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Suppléments</dt>
                  <dd className="tabular-nums">{formatTND(order.totals.supplementsTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Livraison</dt>
                <dd className="tabular-nums">{formatTND(order.totals.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold text-primary tabular-nums">{formatTND(order.totals.total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary/70 p-3">
              <Banknote className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <p className="text-xs leading-snug text-secondary-foreground">
                {order.paymentStatus === "to_collect"
                  ? `Paiement à la livraison — préparez ${formatTND(order.amountToCollect)} en espèces.`
                  : `Paiement : ${paymentLabel}.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
