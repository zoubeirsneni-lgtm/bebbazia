"use client";

// Orchestrateur de l'expérience BEBBA Healthy Food
// Client : vitrine → personnalisation (#11) → panier (#13) → checkout invité
// → confirmation → suivi temps réel (+ carte Bloc 3)
// Équipe (Bloc 3) : cuisine KDS (#21) et espace livreur GPS (#34), accès par
// PIN vérifié côté serveur (mesure transitoire — auth complète au Bloc 4).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/site/site-header";
import { Hero } from "@/components/site/hero";
import { MenuSection } from "@/components/site/menu-section";
import { Concept } from "@/components/site/concept";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductDialog, type ProductDialogMode } from "@/components/site/product-dialog";
import { CartSheet } from "@/components/site/cart-sheet";
import { CheckoutDialog } from "@/components/site/checkout-dialog";
import { ConfirmationDialog } from "@/components/site/confirmation-dialog";
import { OrderTracking } from "@/components/site/order-tracking";
import { StaffGate, staffStore, type DriverSessionInfo } from "@/components/site/staff-gate";
import { KitchenView } from "@/components/site/kitchen-view";
import { DriverView } from "@/components/site/driver-view";
import { useCartStore } from "@/lib/cart-store";
import type { OrderSummary } from "@/lib/order-types";
import type { CategoryView, DeliveryZoneView, ProductView } from "@/components/site/types";
import type { CartOption } from "@/lib/cart";

interface AppShellProps {
  categories: CategoryView[];
  products: ProductView[];
  zones: DeliveryZoneView[];
  deliveryNote: string;
}

export function AppShell({ categories, products, zones, deliveryNote }: AppShellProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // `?token=` est prioritaire au chargement (CDC #20) : le suivi s'ouvre
  // directement, puis l'URL est nettoyée pour ne pas forcer ce token ensuite.
  const [initialUrlToken] = useState(() => searchParams.get("token"));

  // État d'interface
  const [dialogProduct, setDialogProduct] = useState<{ product: ProductView; mode: ProductDialogMode } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderSummary | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(!!initialUrlToken);
  const [trackingToken, setTrackingToken] = useState<string | null>(initialUrlToken);

  // Bloc 3 — vues équipe (kitchen | driver | null = vitrine/suivi)
  const [staffView, setStaffView] = useState<"kitchen" | "driver" | null>(null);
  // Sessions staff via store externe (useSyncExternalStore : hydratation propre)
  const kitchenSession = useSyncExternalStore(
    staffStore.subscribe,
    staffStore.getKitchenSession,
    () => null,
  );
  const driverSession = useSyncExternalStore(
    staffStore.subscribe,
    staffStore.getDriverSession,
    () => null,
  );
  const [availableDrivers, setAvailableDrivers] = useState<{ id: string; name: string }[]>([]);
  const driversLoadedRef = useRef(false);

  const openStaffView = useCallback((view: "kitchen" | "driver") => {
    if (view === "driver" && !driversLoadedRef.current) {
      driversLoadedRef.current = true;
      fetch("/api/driver/drivers")
        .then((r) => (r.ok ? r.json() : { drivers: [] }))
        .then((data) => setAvailableDrivers(data.drivers ?? []))
        .catch(() => setAvailableDrivers([]));
    }
    setTrackingOpen(false);
    setStaffView(view);
  }, []);

  // Nettoyage de l'URL après ouverture via ?token= (effet sans setState)
  useEffect(() => {
    if (!initialUrlToken) return;
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      // environnement sans historique : le suivi reste fonctionnel
    }
  }, [initialUrlToken]);

  // Badge panier — rendu après montage pour éviter tout écart d'hydratation
  // (useSyncExternalStore : pattern React recommandé sans setState dans un effet)
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const cartCount = mounted ? itemCount : 0;

  const handleAddToCart = (
    payload: {
      productId: string;
      name: string;
      imageUrl: string | null;
      unitPrice: number;
      quantity: number;
      options: CartOption[];
    },
    mode: ProductDialogMode,
  ) => {
    useCartStore.getState().addItem(payload);
    setDialogProduct(null);
    if (mode === "order") {
      // Parcours « Commander » → vérification au panier puis confirmation (CDC #11.2)
      setCartOpen(true);
    } else {
      toast({
        title: "Ajouté au panier",
        description: `${payload.name}${payload.options.length > 0 ? " avec vos personnalisations" : ""}.`,
      });
    }
  };

  const openTracking = () => {
    setStaffView(null);
    setTrackingToken(null);
    setTrackingOpen(true);
  };

  const openShop = () => {
    setStaffView(null);
    setTrackingOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        cartCount={cartCount}
        onOpenCart={() => {
          if (staffView || trackingOpen) {
            openShop();
          }
          setCartOpen(true);
        }}
        onOpenTracking={openTracking}
        onOpenKitchen={() => openStaffView("kitchen")}
        onOpenDriver={() => openStaffView("driver")}
        onGoHome={openShop}
      />

      <main className="flex-1">
        {staffView === "kitchen" ? (
          kitchenSession ? (
            <KitchenView pin={kitchenSession.pin} onExit={() => staffStore.clear("kitchen")} />
          ) : (
            <StaffGate
              role="kitchen"
              title="Espace cuisine"
              description="Saisissez le code d'accès de la cuisine pour consulter la file de production."
              onAuthenticated={() => setStaffView("kitchen")}
            />
          )
        ) : staffView === "driver" ? (
          driverSession ? (
            <DriverView session={driverSession} onExit={() => staffStore.clear("driver")} />
          ) : (
            <StaffGate
              role="driver"
              needDriverSelection
              drivers={availableDrivers}
              title="Espace livreur"
              description="Sélectionnez votre nom puis saisissez votre code d'accès."
              onAuthenticated={(s) => {
                if (s.driver) setStaffView("driver");
              }}
            />
          )
        ) : trackingOpen ? (
          <OrderTracking
            key={trackingToken ?? "manual"}
            initialToken={trackingToken}
            onBack={() => setTrackingOpen(false)}
          />
        ) : (
          <>
            <Hero />
            <MenuSection
              categories={categories}
              products={products}
              onOpenProduct={(product, mode) => setDialogProduct({ product, mode })}
            />
            <Concept />
          </>
        )}
      </main>

      <SiteFooter />

      {/* Fenêtre unique de personnalisation — même système pour Commander et
          Personnaliser (CDC #11.3) */}
      <ProductDialog
        product={dialogProduct?.product ?? null}
        mode={dialogProduct?.mode ?? "order"}
        onClose={() => setDialogProduct(null)}
        onAdd={handleAddToCart}
      />

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        zones={zones}
        deliveryNote={deliveryNote}
        onConfirmed={(order) => {
          setCheckoutOpen(false);
          setConfirmedOrder(order);
        }}
      />

      <ConfirmationDialog
        order={confirmedOrder}
        onOpenChange={(open) => {
          if (!open) setConfirmedOrder(null);
        }}
        onTrack={(token) => {
          setConfirmedOrder(null);
          setTrackingToken(token);
          setTrackingOpen(true);
        }}
      />
    </div>
  );
}
