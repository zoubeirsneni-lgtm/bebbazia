"use client";

// Vue Cuisine / KDS — Bloc 3 (CDC #21, #22, #45, #63, #155, #156)
// File de production claire en 3 colonnes (Reçues / En préparation / Prêtes),
// FIFO par heure de commande. La transition received → preparing déclenche la
// consommation du stock CÔTÉ SERVEUR (idempotente, CDC #22) ; la réponse sert
// à afficher le résultat (ingrédients consommés + alertes de seuil/rupture).
// Les alertes globales de stock restent visibles en permanence (CDC #156).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, Ban, ChefHat, Clock, PackageCheck, RefreshCw, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StaffExitButton } from "@/components/site/staff-gate";
import { formatTND } from "@/lib/format";
import { STATUS_LABELS_FR, type OrderStatus } from "@/lib/order-state";

const POLL_MS = 10_000;

interface KitchenOrder {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  preparingSince: string | null;
  customerName: string | null;
  addressNotes: string | null;
  zoneName: string | null;
  deliveryAddress: string;
  items: {
    productName: string;
    quantity: number;
    options: { name: string; quantity: number; priceAdjustment: number }[];
  }[];
  needs: { name: string; unit: string; display: string }[];
  productsWithoutRecipe: string[];
}

interface StockAlert {
  name: string;
  unit: string;
  stockQuantity: number;
  alertThreshold: number;
  level: "below_threshold" | "negative";
}

interface KitchenViewProps {
  pin: string;
  onExit: () => void;
}

const COLUMNS: { status: OrderStatus; title: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { status: "received", title: "Nouvelles commandes", icon: Timer, accent: "text-amber-600" },
  { status: "preparing", title: "En préparation", icon: ChefHat, accent: "text-primary" },
  { status: "ready", title: "Prêtes à servir", icon: PackageCheck, accent: "text-emerald-600" },
];

export function KitchenView({ pin, onExit }: KitchenViewProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<KitchenOrder[] | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/staff/kitchen/orders", { headers: { "x-staff-pin": pin } });
      if (res.status === 401) {
        onExit();
        return;
      }
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      setOrders(data.orders as KitchenOrder[]);
      setAlerts(data.stockAlerts as StockAlert[]);
      setConnectionLost(false);
    } catch {
      if (!silent) setOrders([]);
      setConnectionLost(true); // feedback honnête : rien n'est mis à jour (CDC #106)
    }
  }, [pin, onExit]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const transition = async (orderId: string, to: OrderStatus, label: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-staff-pin": pin },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onExit();
        return;
      }
      if (!res.ok) {
        toast({ title: "Action impossible", description: data.error ?? "Erreur inattendue.", variant: "destructive" });
        return;
      }
      if (data.status === "already") {
        toast({ title: "Déjà appliqué", description: data.message });
      } else {
        toast({ title: label, description: `Commande ${data.orderNumber} → ${STATUS_LABELS_FR[to]}.` });
        // Résultat de la consommation (reçu → preparing uniquement)
        const consumption = data.stockConsumption as {
          consumed: { name: string; display: string }[];
          productsWithoutRecipe: string[];
          alerts: StockAlert[];
        } | null;
        if (consumption) {
          if (consumption.consumed.length > 0) {
            toast({
              title: "Stock consommé",
              description: `${consumption.consumed.map((c) => `${c.name} (−${c.display})`).slice(0, 3).join(", ")}${consumption.consumed.length > 3 ? "…" : ""}`,
            });
          }
          for (const a of consumption.alerts) {
            toast({
              title: a.level === "negative" ? "RUPTURE DE STOCK" : "Seuil d'alerte franchi",
              description: `${a.name} : stock restant ${a.stockQuantity / 1000} ${a.unit}`,
              variant: a.level === "negative" ? "destructive" : "default",
            });
          }
          if (consumption.productsWithoutRecipe.length > 0) {
            toast({
              title: "Recette non renseignée",
              description: `Aucun stock consommé pour : ${consumption.productsWithoutRecipe.join(", ")}.`,
            });
          }
        }
      }
      await load(true);
    } catch {
      toast({ title: "Erreur réseau", description: "L'action n'a pas pu être confirmée par le serveur.", variant: "destructive" });
    } finally {
      setBusyOrderId(null);
    }
  };

  const elapsedLabel = (iso: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  };

  const primaryAction = (order: KitchenOrder): { to: OrderStatus; label: string } | null => {
    switch (order.status) {
      case "received":
        return { to: "preparing", label: "Démarrer la préparation" };
      case "preparing":
        return { to: "ready", label: "Préparation terminée" };
      case "ready":
        return { to: "waiting_for_driver", label: "Passer en attente livreur" };
      default:
        return null;
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="kitchen-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Espace cuisine</p>
          <h1 id="kitchen-title" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            File de production
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {connectionLost && (
            <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
              <AlertTriangle className="h-3 w-3" aria-hidden /> Connexion perdue — données figées
            </Badge>
          )}
          <StaffExitButton role="kitchen" onExit={onExit} />
        </div>
      </div>

      {/* Alertes stock globales (CDC #156) */}
      {alerts.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Stock à surveiller ({alerts.length})
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {alerts.map((a) => (
              <li
                key={a.name}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  a.level === "negative" ? "bg-destructive text-white" : "bg-amber-500/20 text-amber-800"
                }`}
              >
                {a.name} : {a.level === "negative" ? "RUPTURE" : `${a.stockQuantity / 1000} ${a.unit}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Colonnes de production */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colOrders = (orders ?? []).filter((o) => o.status === col.status);
          const ColIcon = col.icon;
          return (
            <div key={col.status} className="rounded-2xl border border-border/70 bg-muted/30 p-3">
              <h2 className={`flex items-center gap-2 px-1 pb-2 text-sm font-bold ${col.accent}`}>
                <ColIcon className="h-4 w-4" aria-hidden />
                {col.title}
                <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {colOrders.length}
                </span>
              </h2>

              {orders === null && (
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              )}

              {orders !== null && colOrders.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">Aucune commande</p>
              )}

              <ul className="space-y-3">
                {colOrders.map((order) => {
                  const action = primaryAction(order);
                  const busy = busyOrderId === order.id;
                  const canCancel = order.status === "received" || order.status === "preparing";
                  return (
                    <li key={order.id} className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-sm font-extrabold text-foreground">{order.number}</p>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden />
                          {elapsedLabel(order.createdAt)}
                        </span>
                      </div>

                      <ul className="mt-2 space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="text-sm">
                            <span className="font-semibold text-primary">{item.quantity}×</span>{" "}
                            <span className="text-foreground">{item.productName}</span>
                            {item.options.length > 0 && (
                              <span className="block pl-5 text-xs text-muted-foreground">
                                {item.options
                                  .map((o) => `${o.quantity > 1 ? `${o.quantity}× ` : ""}${o.name}`)
                                  .join(" • ")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>

                      {order.addressNotes && (
                        <p className="mt-2 rounded-lg bg-secondary/60 px-2 py-1 text-xs text-secondary-foreground">
                          Note : {order.addressNotes}
                        </p>
                      )}

                      {/* Informations de production : besoins ingrédients (CDC #21) */}
                      {order.needs.length > 0 && (
                        <details className="mt-2 rounded-lg border border-border/50 px-2 py-1">
                          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                            Ingrédients requis
                          </summary>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {order.needs.map((n) => `${n.name} (${n.display})`).join(", ")}
                          </p>
                        </details>
                      )}
                      {order.productsWithoutRecipe.length > 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          Recette non renseignée : {order.productsWithoutRecipe.join(", ")}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        {action && (
                          <Button
                            size="sm"
                            className="h-9 flex-1 rounded-lg font-bold"
                            disabled={busy}
                            onClick={() => transition(order.id, action.to, action.label)}
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            )}
                            {action.label}
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg text-destructive hover:bg-destructive/10"
                            disabled={busy}
                            aria-label={`Annuler la commande ${order.number}`}
                            onClick={() => transition(order.id, "cancelled", "Commande annulée")}
                          >
                            <Ban className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </div>

                      {order.status === "received" && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Le démarrage consommera le stock (une seule fois).
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Rafraîchissement automatique toutes les 10 secondes • Le stock est consommé au clic « Démarrer la préparation », une seule fois (CDC #22).
      </p>
    </section>
  );
}
