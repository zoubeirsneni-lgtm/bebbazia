// Machine d'état officielle des commandes — référence unique (CDC #14, #15, #64, #247)
// Les valeurs sont EXACTES et en casse obligatoire (minuscules).
// Aucune transition non autorisée ne doit être acceptée (CDC #64).

export const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready",
  "waiting_for_driver",
  "delivering",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Cycle nominal (CDC #16) : received → preparing → ready →
// waiting_for_driver → delivering → delivered (+ cancelled selon règles #43)
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["waiting_for_driver", "cancelled"],
  waiting_for_driver: ["delivering", "cancelled"],
  delivering: ["delivered"],
  delivered: [],
  cancelled: [],
};

// Libellés d'affichage FR — les valeurs stockées/restituées restent en casse CDC
export const STATUS_LABELS_FR: Record<OrderStatus, string> = {
  received: "Commande reçue",
  preparing: "En préparation",
  ready: "Prête",
  waiting_for_driver: "En attente de livreur",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

// Statut de paiement COD — casse obligatoire (CDC #17)
export const PAYMENT_STATUSES = ["to_collect", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_LABELS_FR: Record<PaymentStatus, string> = {
  to_collect: "À encaisser à la livraison",
  paid: "Encaissé",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// Tokens de tracking (CDC #20)
export const TRACKING_TOKEN_LENGTH = 8;
// Fallback de démonstration défini par le CDC #20 (longueur hors norme volontaire)
export const DEMO_TRACKING_TOKEN = "tk_bebba_1047_demo";
// Clé locale de référence (CDC #20)
export const LAST_TRACKING_TOKEN_KEY = "bebba_last_tracking_token";

// Alphabet sans caractères ambigus (pas de I/O/0/1) pour les tokens générés
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isTrackingTokenFormat(value: string): boolean {
  return value === DEMO_TRACKING_TOKEN ||
    (value.length === TRACKING_TOKEN_LENGTH && /^[A-Z2-9]+$/.test(value));
}

export function generateTrackingToken(): string {
  const bytes = new Uint8Array(TRACKING_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const b of bytes) token += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  return token;
}
