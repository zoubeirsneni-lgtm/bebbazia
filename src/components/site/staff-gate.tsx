"use client";

// Garde d'accès staff — Bloc 3 (mesure transitoire)
// Le PIN est VÉRIFIÉ CÔTÉ SERVEUR à chaque appel API (en-tête X-Staff-Pin) :
// ce composant ne fait que mémoriser la saisie de la session — masquer le
// formulaire ne constituerait pas une sécurité, c'est la vérification serveur
// systématique qui protège (CDC #54 / #142).
// Bloc 4 : remplacé par l'authentification NextAuth + matrice RBAC complète.

import { useState } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type StaffRole = "kitchen" | "driver";

export interface DriverSession {
  pin: string;
  driverId: string;
  driverName: string;
}

const KITCHEN_STORAGE_KEY = "bebba_staff_kitchen_pin";
const DRIVER_STORAGE_KEY = "bebba_staff_driver_session";

// ── Store externe des sessions staff ──
// sessionStorage n'est PAS un état React : la lecture/écriture passe par un
// store externe consommé via useSyncExternalStore (pattern recommandé — évite
// le setState-dans-effet et les écarts d'hydratation).
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

export const staffStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // ⚠ getSnapshot doit renvoyer une référence STABLE (sinon boucle infinie) :
  // les valeurs sont cachées en mémoire, sessionStorage n'est lu qu'une fois.
  getKitchenSession(): { pin: string } | null {
    if (!kitchenLoaded) {
      kitchenLoaded = true;
      try {
        const pin = sessionStorage.getItem(KITCHEN_STORAGE_KEY);
        if (pin) kitchenCache = { pin };
      } catch {
        // stockage indisponible
      }
    }
    return kitchenCache;
  },

  getDriverSession(): DriverSession | null {
    if (!driverLoaded) {
      driverLoaded = true;
      try {
        const raw = sessionStorage.getItem(DRIVER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DriverSession;
          if (parsed.pin && parsed.driverId) driverCache = parsed;
        }
      } catch {
        // stockage indisponible
      }
    }
    return driverCache;
  },

  setKitchenSession(pin: string) {
    try {
      sessionStorage.setItem(KITCHEN_STORAGE_KEY, pin);
    } catch {
      // stockage indisponible : session non mémorisée
    }
    kitchenCache = { pin };
    kitchenLoaded = true;
    notify();
  },

  setDriverSession(session: DriverSession) {
    try {
      sessionStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // stockage indisponible : session non mémorisée
    }
    driverCache = session;
    driverLoaded = true;
    notify();
  },

  clear(role: StaffRole) {
    try {
      sessionStorage.removeItem(role === "kitchen" ? KITCHEN_STORAGE_KEY : DRIVER_STORAGE_KEY);
    } catch {
      // stockage indisponible
    }
    if (role === "kitchen") {
      kitchenCache = null;
    } else {
      driverCache = null;
    }
    notify();
  },
};

let kitchenCache: { pin: string } | null = null;
let kitchenLoaded = false;
let driverCache: DriverSession | null = null;
let driverLoaded = false;

interface StaffGateProps {
  role: StaffRole;
  title: string;
  description: string;
  // Les livreurs choisissent leur identité en plus du PIN
  needDriverSelection?: boolean;
  drivers?: { id: string; name: string }[];
  onAuthenticated: (session: { pin: string; driver?: DriverSession }) => void;
}

export function StaffGate({ role, title, description, needDriverSelection = false, drivers = [], onAuthenticated }: StaffGateProps) {
  const [pin, setPin] = useState("");
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (needDriverSelection && !driverId) {
      setError("Sélectionnez votre nom de livreur.");
      return;
    }
    if (pin.length < 4) {
      setError("Saisissez votre code d'accès à 4 chiffres.");
      return;
    }

    setChecking(true);
    try {
      let driver: DriverSession | undefined;
      if (needDriverSelection) {
        const found = drivers.find((d) => d.id === driverId);
        if (!found) {
          setError("Livreur introuvable.");
          return;
        }
        driver = { pin, driverId: found.id, driverName: found.name };
      }
      // Vérification RÉELLE côté serveur avant d'entrer dans l'écran
      const headers: Record<string, string> = { "x-staff-pin": pin };
      if (driver) headers["x-driver-id"] = driver.driverId;
      const probeUrl = needDriverSelection ? "/api/driver/orders" : "/api/staff/kitchen/orders";
      const res = await fetch(probeUrl, { headers });
      if (res.status === 401) {
        setError("Code d'accès invalide.");
        return;
      }
      if (!res.ok) {
        setError("Service indisponible. Réessayez dans un instant.");
        return;
      }
      // Mémorise la session puis entre
      if (role === "kitchen") {
        staffStore.setKitchenSession(pin);
      } else if (driver) {
        staffStore.setDriverSession(driver);
      }
      onAuthenticated({ pin, driver });
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6" aria-labelledby="staff-gate-title">
      <Card className="rounded-3xl border-border/70">
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            {role === "kitchen" ? (
              <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
            ) : (
              <KeyRound className="h-7 w-7 text-primary" aria-hidden />
            )}
          </div>
          <CardTitle id="staff-gate-title" className="text-xl font-extrabold">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {needDriverSelection && (
              <div className="space-y-1.5">
                <label htmlFor="staff-driver" className="text-sm font-semibold text-foreground">
                  Votre nom
                </label>
                <select
                  id="staff-driver"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">— Sélectionnez —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="staff-pin" className="text-sm font-semibold text-foreground">
                Code d&apos;accès
              </label>
              <Input
                id="staff-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="••••"
                className="h-12 rounded-xl text-center font-mono text-2xl tracking-[0.5em]"
                aria-invalid={!!error}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl font-bold" disabled={checking}>
              {checking ? "Vérification…" : "Entrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

/** Bouton de sortie de session staff. */
export function StaffExitButton({ role, onExit }: { role: StaffRole; onExit: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-full text-muted-foreground"
      onClick={() => {
        staffStore.clear(role);
        onExit();
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Quitter
    </Button>
  );
}
