// Types du suivi client + re-export des références officielles (CDC #14/#17/#20)
import { PAYMENT_LABELS_FR, PAYMENT_STATUSES, STATUS_LABELS_FR, type PaymentStatus } from "@/lib/order-state";

export { STATUS_LABELS_FR, PAYMENT_LABELS_FR, LAST_TRACKING_TOKEN_KEY, DEMO_TRACKING_TOKEN, isOrderStatus } from "@/lib/order-state";

export function isPaymentStatusSafe(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export interface TrackItemOption {
  optionId: string;
  name: string;
  priceAdjustment: number;
  quantity: number;
}

export interface TrackItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  options: TrackItemOption[];
}

export interface TrackEvent {
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
}

export interface TrackOrder {
  number: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  totals: {
    productsTotal: number;
    customizationsTotal: number;
    supplementsTotal: number;
    deliveryFee: number;
    promotionsTotal: number;
    adjustmentsTotal: number;
    total: number;
  };
  amountToCollect: number;
  driverFirstName: string | null;
  // Bloc 3 — carte temps réel : présent UNIQUEMENT pendant delivering (CDC #12/#133)
  liveTracking: {
    driverFirstName: string | null;
    driverPosition: { lat: number; lng: number; recordedAt: string } | null;
    destination: { resolved: boolean; lat: number | null; lng: number | null };
    distanceKm: number | null;
    etaMinutes: number | null;
  } | null;
  items: TrackItem[];
  events: TrackEvent[];
}
