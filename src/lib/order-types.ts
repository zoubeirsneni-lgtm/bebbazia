// Type partagé du résumé de commande renvoyé par POST /api/orders
// (montants en millimes TND — CDC #65/#66 ; statuts en casse CDC #14/#17)
export interface OrderSummary {
  number: string;
  trackingToken: string;
  status: string;
  productsTotal: number;
  customizationsTotal: number;
  supplementsTotal: number;
  deliveryFee: number;
  promotionsTotal: number;
  adjustmentsTotal: number;
  total: number;
  paymentStatus: string;
  amountToCollect: number;
}
