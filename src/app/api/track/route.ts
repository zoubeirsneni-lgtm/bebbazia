// Suivi de commande par trackingToken — CDC #20 + carte Bloc 3 (#48, #132, #133)
// Chaque commande suivable dispose d'un token de 8 caractères ; le fallback de
// démonstration officiel `tk_bebba_1047_demo` est également accepté.
// La réponse ne divulgue aucune donnée personnelle au-delà du nécessaire
// (pas de téléphone — respect de l'esprit CDC #90 / #130).
//
// Bloc 3 — position du livreur : UNIQUEMENT pendant `delivering` (CDC #12 /
// #133 — le suivi GPS cesse dès que les conditions métier ne sont plus
// réunies, rien n'est servi avant ni après). La destination est géocodée avec
// cache (CDC #47 / #48) ; adresse non géocodable → `destination: {resolved:
// false}` et l'UI reste utilisable. Distance à vol d'oiseau étiquetée
// « estimation » côté UI (jamais présentée comme un itinéraire routier).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isTrackingTokenFormat, DEMO_TRACKING_TOKEN } from "@/lib/order-state";
import { safeParseJSON } from "@/lib/format";
import { geocodeAddress, haversineKm } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get("token") ?? "").trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Code de suivi manquant." }, { status: 400 });
    }

    // Le fallback de démonstration est comparé tel quel ; les tokens normaux
    // sont normalisés en majuscules (tolérance de saisie utilisateur).
    const normalized = token === DEMO_TRACKING_TOKEN ? token : token.toUpperCase();

    if (!isTrackingTokenFormat(normalized)) {
      return NextResponse.json(
        { ok: false, error: "Format de code de suivi invalide (8 caractères attendus)." },
        { status: 400 },
      );
    }

    const order = await db.order.findUnique({
      where: { trackingToken: normalized },
      include: {
        items: true,
        events: { orderBy: { createdAt: "asc" } },
        driver: { select: { name: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Aucune commande trouvée pour ce code de suivi." },
        { status: 404 },
      );
    }

    // ── Bloc 3 : position livreur + destination — uniquement pendant delivering ──
    let liveTracking: {
      driverFirstName: string | null;
      driverPosition: { lat: number; lng: number; recordedAt: string } | null;
      destination: { resolved: boolean; lat: number | null; lng: number | null };
      distanceKm: number | null; // à vol d'oiseau — estimation honnête
      etaMinutes: number | null; // vitesse urbaine indicative 25 km/h
    } | null = null;

    if (order.status === "delivering") {
      const [lastLocation] = await db.driverLocation.findMany({
        where: { orderId: order.id },
        orderBy: { recordedAt: "desc" },
        take: 1,
      });

      // Destination : coordonnées connues, sinon géocodage paresseux avec cache
      let destLat = order.addressLat;
      let destLng = order.addressLng;
      if (destLat == null || destLng == null) {
        const geo = await geocodeAddress(order.deliveryAddress);
        if (geo.resolved) {
          destLat = geo.lat;
          destLng = geo.lng;
          // Persistance : une seule résolution par commande (cache global + champ)
          await db.order.update({
            where: { id: order.id },
            data: { addressLat: geo.lat, addressLng: geo.lng },
          });
        }
      }

      let distanceKm: number | null = null;
      if (lastLocation && destLat != null && destLng != null) {
        distanceKm = haversineKm(lastLocation.lat, lastLocation.lng, destLat, destLng);
      }

      liveTracking = {
        driverFirstName: order.driver ? order.driver.name.split(" ")[0] : null,
        driverPosition: lastLocation
          ? { lat: lastLocation.lat, lng: lastLocation.lng, recordedAt: lastLocation.recordedAt.toISOString() }
          : null, // position encore jamais reçue — AUCUNE valeur fictive (CDC #34)
        destination: { resolved: destLat != null && destLng != null, lat: destLat, lng: destLng },
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
        etaMinutes: distanceKm != null ? Math.max(2, Math.round((distanceKm / 25) * 60)) : null,
      };
    }

    return NextResponse.json({
      ok: true,
      order: {
        number: order.number,
        status: order.status, // casse officielle CDC #14
        paymentStatus: order.paymentStatus, // CDC #17
        createdAt: order.createdAt,
        totals: {
          productsTotal: order.productsTotal,
          customizationsTotal: order.customizationsTotal,
          supplementsTotal: order.supplementsTotal,
          deliveryFee: order.deliveryFee,
          promotionsTotal: order.promotionsTotal,
          adjustmentsTotal: order.adjustmentsTotal,
          total: order.total,
        },
        amountToCollect: order.amountToCollect,
        driverFirstName: order.driver ? order.driver.name.split(" ")[0] : null,
        liveTracking,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          options: safeParseJSON<{ optionId: string; name: string; priceAdjustment: number; quantity: number }[]>(i.options, []),
        })),
        events: order.events.map((e) => ({
          type: e.type,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    });
  } catch (e) {
    console.error("[GET /api/track]", e);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche du suivi. Merci de réessayer." },
      { status: 500 },
    );
  }
}
