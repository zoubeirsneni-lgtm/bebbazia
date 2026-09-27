// BEBBA Healthy Food — Géocodage serveur (CDC #47 / #48)
// Fournisseur V1 : Nominatim (OpenStreetMap) — gratuit, sans clé, limite
// 1 requête/s : TOUTE résolution passe par le cache GeocodeCache en base.
// Cas gérés : adresse non géocodable ou ambiguë (#47) → résultat non résolu
// mis en cache aussi, pour ne pas marteler le service.
//
// Le pattern adaptateur est le même que pour la carte : basculer vers
// l'API Geocoding de Google plus tard = changer ce fichier uniquement.

import { db } from "@/lib/db";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
// Nominatim exige un User-Agent identifiant l'application.
const USER_AGENT = "BEBBA-Healthy-Food/1.0 (restaurant web app)";

export interface GeocodeResult {
  resolved: boolean;
  lat: number | null;
  lng: number | null;
  displayName: string | null;
  fromCache: boolean;
}

/** Résout une adresse de livraison via le cache puis Nominatim. */
export async function geocodeAddress(rawAddress: string): Promise<GeocodeResult> {
  const query = rawAddress.trim().toLowerCase().replace(/\s+/g, " ");
  if (query.length < 4) {
    return { resolved: false, lat: null, lng: null, displayName: null, fromCache: false };
  }

  // 1) Cache d'abord (limite Nominatim : 1 req/s)
  const cached = await db.geocodeCache.findUnique({ where: { query } });
  if (cached) {
    return {
      resolved: cached.resolved,
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName,
      fromCache: true,
    };
  }

  // 2) Nominatim
  let resolved = false;
  let lat: number | null = null;
  let lng: number | null = null;
  let displayName: string | null = null;
  try {
    const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(rawAddress)}&format=jsonv2&limit=1&addressdetails=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
      if (Array.isArray(data) && data.length > 0 && data[0].lat != null && data[0].lon != null) {
        lat = Number.parseFloat(data[0].lat);
        lng = Number.parseFloat(data[0].lon);
        displayName = data[0].display_name ?? null;
        resolved = Number.isFinite(lat) && Number.isFinite(lng);
      }
    }
  } catch {
    // Service indisponible / timeout : on ne met PAS en cache un échec réseau
    // (seul un verdict Nominatim réel est définitif) et on renvoie non résolu.
    return { resolved: false, lat: null, lng: null, displayName: null, fromCache: false };
  }

  // 3) Verdict mis en cache (y compris non résolu — adresse introuvable réelle)
  await db.geocodeCache.upsert({
    where: { query },
    update: { resolved, lat, lng, displayName },
    create: { query, resolved, lat, lng, displayName },
  });

  return { resolved, lat, lng, displayName, fromCache: false };
}

/** Distance Haversine en kilomètres (à vol d'oiseau — étiquetée comme telle dans l'UI). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}
