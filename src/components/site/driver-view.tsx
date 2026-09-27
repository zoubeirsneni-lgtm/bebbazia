"use client";

// Espace livreur — Bloc 3 (CDC #33, #34, #49, #50, #106, #157, #158, #159, #160, #162)
// • File des commandes prêtes à prendre (waiting_for_driver) + mes livraisons (delivering)
// • GPS : une position toutes les 10 s envoyée au serveur PENDANT delivering
//   uniquement (CDC #12 / #162). La prise (getCurrentPosition) se fait sur
//   l'appareil ; AUCUNE position n'est inventée en cas d'échec (CDC #34).
// • Feedback honnête (CDC #106) : le badge reflète la CONFIRMATION du serveur —
//   si la transmission échoue, l'écran le dit clairement.
// • La confirmation de livraison est distincte de l'encaissement : le COD reste
//   `to_collect` après une livraison réussie (CDC #18 / #50).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Banknote, Bike, CheckCircle2, MapPin, Navigation, PackageCheck, Phone, RefreshCw, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StaffExitButton } from "@/components/site/staff-gate";
import { formatTND } from "@/lib/format";
import { STATUS_LABELS_FR } from "@/lib/order-state";

const POLL_MS = 10_000;
const GPS_SEND_MS = 10_000; // CDC #12 / #162

interface DriverOrder {
  id: string;
  number: string;
  status: string;
  deliveryAddress: string;
  addressNotes: string | null;
  zoneName: string | null;
  total: number;
  amountToCollect: number;
  paymentStatus: string;
  customerPhone: string;
  customerName: string | null;
  deliveryAttempts: number;
  lastDeliveryIssue: string | null;
  createdAt: string;
}

export interface DriverSessionInfo {
  pin: string;
  driverId: string;
  driverName: string;
}

interface DriverViewProps {
  session: DriverSessionInfo;
  onExit: () => void;
}

type GpsState =
  | { kind: "idle" }
  | { kind: "acquiring" }
  | { kind: "ok"; recordedAt: string; purged?: number }
  | { kind: "throttled" }
  | { kind: "no_delivery" }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "error"; detail: string };

export function DriverView({ session, onExit }: DriverViewProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState<DriverOrder[] | null>(null);
  const [mine, setMine] = useState<DriverOrder[] | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>({ kind: "idle" });
  const [failDialog, setFailDialog] = useState<{ order: DriverOrder; note: string } | null>(null);
  const mineRef = useRef<DriverOrder[]>([]);
  const gpsBusyRef = useRef(false);
  const headersRef = useRef<Record<string, string>>({});

  headersRef.current = { "x-staff-pin": session.pin, "x-driver-id": session.driverId };

  const load = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/driver/orders", { headers: headersRef.current });
      if (res.status === 401) {
        onExit();
        return;
      }
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      setPending(data.pending as DriverOrder[]);
      setMine(data.mine as DriverOrder[]);
      mineRef.current = data.mine as DriverOrder[];
      setConnectionLost(false);
    } catch {
      if (!silent) {
        setPending([]);
        setMine([]);
      }
      setConnectionLost(true); // rien n'est mis à jour silencieusement (CDC #106)
    }
  }, [onExit]);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // ── Transmission GPS : une position toutes les 10 s pendant delivering ──
  const sendPosition = useCallback(async (lat: number, lng: number, accuracyM?: number) => {
    if (gpsBusyRef.current) return;
    gpsBusyRef.current = true;
    try {
      const res = await fetch("/api/driver/location", {
        method: "POST",
        headers: { ...headersRef.current, "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, accuracyM }),
      });
      if (res.status === 401) {
        onExit();
        return;
      }
      const data = await res.json();
      if (data.recorded) {
        setGpsState({ kind: "ok", recordedAt: data.recordedAt });
      } else if (data.reason === "throttled") {
        setGpsState({ kind: "throttled" });
      } else if (data.reason === "no_active_delivery") {
        setGpsState({ kind: "no_delivery" });
      } else {
        setGpsState({ kind: "error", detail: data.error ?? "Réponse inattendue du serveur." });
      }
    } catch {
      setGpsState({ kind: "error", detail: "Transmission impossible — la position n'a PAS été enregistrée." });
    } finally {
      gpsBusyRef.current = false;
    }
  }, [onExit]);

  useEffect(() => {
    const hasActiveDelivery = mineRef.current.length > 0;
    if (!hasActiveDelivery) {
      setGpsState({ kind: "idle" });
      return;
    }
    setGpsState({ kind: "acquiring" });

    const tick = () => {
      if (mineRef.current.length === 0) return;
      if (!("geolocation" in navigator)) {
        setGpsState({ kind: "unavailable" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void sendPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? undefined);
        },
        (err) => {
          // Aucune position fictive (CDC #34) : on affiche l'erreur réelle.
          setGpsState(
            err.code === err.PERMISSION_DENIED
              ? { kind: "denied" }
              : err.code === err.POSITION_UNAVAILABLE
                ? { kind: "unavailable" }
                : { kind: "error", detail: err.message },
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
      );
    };

    tick();
    const id = setInterval(tick, GPS_SEND_MS);
    return () => clearInterval(id);
  }, [mine, sendPosition]);

  const act = async (orderId: string, action: "accept" | "delivered" | "refuse" | "fail", note?: string, successTitle = "Action confirmée") => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch("/api/driver/orders", {
        method: "POST",
        headers: { ...headersRef.current, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, note }),
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
      toast({ title: data.status === "already" ? "Déjà appliqué" : successTitle, description: data.message });
      await load(true);
    } catch {
      toast({ title: "Erreur réseau", description: "L'action n'a pas été confirmée par le serveur — réessayez.", variant: "destructive" });
    } finally {
      setBusyOrderId(null);
    }
  };

  const gpsBadge = () => {
    switch (gpsState.kind) {
      case "idle":
        return null;
      case "acquiring":
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><Navigation className="h-3 w-3 animate-pulse" aria-hidden /> Acquisition GPS…</Badge>;
      case "ok":
        return <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700"><CheckCircle2 className="h-3 w-3" aria-hidden /> Position enregistrée {new Date(gpsState.recordedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</Badge>;
      case "throttled":
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><Navigation className="h-3 w-3" aria-hidden /> Trop tôt — prochaine transmission dans 10 s</Badge>;
      case "no_delivery":
        return null;
      case "denied":
        return <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden /> GPS désactivé — autorisez la localisation</Badge>;
      case "unavailable":
        return <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden /> Position indisponible — nouvelle tentative en cours</Badge>;
      case "error":
        return <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden /> {gpsState.detail}</Badge>;
    }
  };

  const orderCard = (order: DriverOrder, mode: "pending" | "mine") => {
    const busy = busyOrderId === order.id;
    return (
      <li key={order.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-base font-extrabold text-foreground">{order.number}</p>
            <p className="text-xs text-muted-foreground">
              {order.customerName ? `${order.customerName} • ` : ""}
              Zone : {order.zoneName ?? "—"}
              {order.deliveryAttempts > 0 && ` • Tentative ${order.deliveryAttempts + 1}`}
            </p>
          </div>
          <Badge className="gap-1 rounded-full bg-amber-500 px-3 py-1 text-white">
            <Banknote className="h-3.5 w-3.5" aria-hidden />
            {formatTND(order.amountToCollect)} à encaisser
          </Badge>
        </div>

        <p className="mt-2 flex items-start gap-1.5 text-sm text-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {order.deliveryAddress}
        </p>
        {order.addressNotes && (
          <p className="mt-1 rounded-lg bg-secondary/60 px-2 py-1 text-xs text-secondary-foreground">
            Note client : {order.addressNotes}
          </p>
        )}
        {order.lastDeliveryIssue && (
          <p className="mt-1 text-xs text-amber-600">Dernier problème signalé : {order.lastDeliveryIssue}</p>
        )}

        <a
          href={`tel:${order.customerPhone}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <Phone className="h-4 w-4" aria-hidden />
          Appeler le client
        </a>

        <div className="mt-3 flex flex-wrap gap-2">
          {mode === "pending" ? (
            <>
              <Button
                className="h-10 flex-1 rounded-lg font-bold"
                disabled={busy}
                onClick={() => act(order.id, "accept", undefined, "Livraison prise en charge")}
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <Bike className="h-4 w-4" aria-hidden />}
                Prendre en charge
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-lg"
                disabled={busy}
                aria-label={`Refuser la commande ${order.number}`}
                onClick={() => act(order.id, "refuse", undefined, "Refus enregistré")}
              >
                <XCircle className="h-4 w-4" aria-hidden />
                Refuser
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-10 flex-1 rounded-lg font-bold"
                disabled={busy}
                onClick={() => act(order.id, "delivered", undefined, "Livraison confirmée")}
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                Livraison effectuée
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-lg text-destructive hover:bg-destructive/10"
                disabled={busy}
                onClick={() => setFailDialog({ order, note: "" })}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Signaler un échec
              </Button>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6" aria-labelledby="driver-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Espace livraison</p>
          <h1 id="driver-title" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Bonjour {session.driverName.split(" ")[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {gpsBadge()}
          {connectionLost && (
            <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
              <AlertTriangle className="h-3 w-3" aria-hidden /> Hors ligne — données figées
            </Badge>
          )}
          <StaffExitButton role="driver" onExit={onExit} />
        </div>
      </div>

      {/* Mes livraisons en cours */}
      <div className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
          <Bike className="h-4 w-4" aria-hidden />
          Mes livraisons en cours ({mine?.length ?? 0})
        </h2>
        {mine === null && <Skeleton className="mt-3 h-32 w-full rounded-xl" />}
        {mine !== null && mine.length === 0 && (
          <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucune livraison en cours. Prenez une commande ci-dessous pour démarrer la transmission GPS.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {(mine ?? []).map((o) => orderCard(o, "mine"))}
        </ul>
      </div>

      {/* File des commandes prêtes */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PackageCheck className="h-4 w-4 text-primary" aria-hidden />
          Commandes prêtes à prendre ({pending?.length ?? 0})
        </h2>
        {pending === null && <Skeleton className="mt-3 h-32 w-full rounded-xl" />}
        {pending !== null && pending.length === 0 && (
          <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucune commande en attente de livreur.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {(pending ?? []).map((o) => orderCard(o, "pending"))}
        </ul>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Position transmise toutes les 10 secondes pendant vos livraisons uniquement (CDC #12) •
        Historique conservé 72 h (CDC #13) • La livraison ne modifie pas l&apos;encaissement (CDC #50).
      </p>

      {/* Dialog d'échec — motif obligatoire (CDC #158) */}
      <Dialog open={!!failDialog} onOpenChange={(open) => !open && setFailDialog(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler un échec de livraison</DialogTitle>
            <DialogDescription>
              La commande {failDialog?.order.number} retournera en attente de livreur avec votre motif (CDC #158 / #159).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={failDialog?.note ?? ""}
            onChange={(e) => setFailDialog((prev) => (prev ? { ...prev, note: e.target.value } : prev))}
            placeholder="Motif obligatoire : client absent, adresse introuvable…"
            rows={3}
            className="rounded-xl"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFailDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={busyOrderId === failDialog?.order.id || (failDialog?.note.trim().length ?? 0) < 3}
              onClick={async () => {
                if (!failDialog) return;
                await act(failDialog.order.id, "fail", failDialog.note.trim(), "Échec enregistré");
                setFailDialog(null);
              }}
            >
              Enregistrer l&apos;échec
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
