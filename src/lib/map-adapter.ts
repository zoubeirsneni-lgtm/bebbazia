// BEBBA Healthy Food — Adaptateur de cartographie (CDC #48)
// Le cahier des charges exige une intégration cartographique prévoyant
// géocodage, affichage de position, itinéraire et ETA, avec une configuration
// sécurisée et une évolutivité. Décision validée avec le client : V1 utilise
// OpenStreetMap + Leaflet (100 % gratuit, sans carte bancaire).
//
// Le pattern adaptateur permet de basculer vers Google Maps (ou autre
// fournisseur) par simple ajout d'une implémentation, sans toucher au reste
// de l'application.

export interface MapOptions {
  center: { lat: number; lng: number };
  zoom: number;
}

export interface MarkerOptions {
  label?: string;
  variant?: "driver" | "destination";
}

/** Poignée d'un marqueur : mise à jour sans recréation (positions GPS en série). */
export interface MapMarkerHandle {
  update(lat: number, lng: number): void;
  remove(): void;
}

/**
 * Contrat unique utilisé par les écrans (suivi client, espace livreur).
 * Toute implémentation (Leaflet/OSM aujourd'hui, Google Maps demain) doit
 * satisfaire cette interface — aucun autre fichier n'importe Leaflet.
 */
export interface MapProvider {
  /** Charge les ressources du fournisseur et attache la carte au conteneur. */
  init(container: HTMLElement, options: MapOptions): Promise<void>;
  setView(lat: number, lng: number, zoom?: number): void;
  addMarker(lat: number, lng: number, options?: MarkerOptions): MapMarkerHandle;
  /** Encadre tous les marqueurs connus (optionnel selon le fournisseur). */
  fitAll(paddingRatio?: number): void;
  destroy(): void;
}

export function getMapProvider(): MapProvider {
  // V1 : OpenStreetMap. Bascule future : config
  // `NEXT_PUBLIC_MAP_PROVIDER=google` + implémentation MapProvider Google.
  return new LeafletOsmProvider();
}

// ─── Implémentation Leaflet + OpenStreetMap ─────────────────────────────────

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

class LeafletOsmProvider implements MapProvider {
  private map: import("leaflet").Map | null = null;
  private leaflet: typeof import("leaflet") | null = null;
  private markers: import("leaflet").Marker[] = [];

  async init(container: HTMLElement, options: MapOptions) {
    // Import dynamique : Leaflet ne peut pas s'exécuter côté serveur.
    const [leafletMod, cssMod] = await Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]);
    void cssMod; // le CSS est bundlé par l'import
    const L = leafletMod.default ?? leafletMod;
    this.leaflet = L;

    // Icônes par défaut de Leaflet : URLs cassées sous bundler — on fournit
    // nos propres icônes SVG data-URI (feuille BEBBA / pin).
    this.map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(this.map);
  }

  setView(lat: number, lng: number, zoom?: number) {
    this.map?.setView([lat, lng], zoom ?? this.map.getZoom());
  }

  addMarker(lat: number, lng: number, options?: MarkerOptions): MapMarkerHandle {
    if (!this.leaflet || !this.map) throw new Error("Carte non initialisée");
    const L = this.leaflet;
    const icon = L.divIcon({
      className: "bebba-map-marker",
      html: markerHtml(options?.variant ?? "driver", options?.label),
      iconSize: [36, 36],
      iconAnchor: [18, 34],
    });
    const marker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.markers.push(marker);
    return {
      update: (nlat: number, nlng: number) => marker.setLatLng([nlat, nlng]),
      remove: () => {
        marker.remove();
        this.markers = this.markers.filter((m) => m !== marker);
      },
    };
  }

  fitAll(paddingRatio = 0.15) {
    if (!this.map || this.markers.length === 0) return;
    const bounds = this.leaflet!.latLngBounds(this.markers.map((m) => m.getLatLng()));
    this.map.fitBounds(bounds.pad(paddingRatio), { maxZoom: 16 });
  }

  destroy() {
    this.map?.remove();
    this.map = null;
    this.markers = [];
  }
}

function markerHtml(variant: "driver" | "destination", label?: string): string {
  // Pas d'emoji : SVG inline, couleurs du design BEBBA.
  if (variant === "destination") {
    return `<div style="position:relative;width:36px;height:36px">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#1b7a43"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff"/>
      </svg>
      ${label ? `<div style="position:absolute;top:38px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:600;color:#14532d;background:#ffffffdd;padding:1px 6px;border-radius:6px">${escapeHtml(label)}</div>` : ""}
    </div>`;
  }
  return `<div style="position:relative;width:36px;height:36px">
    <div style="width:36px;height:36px;border-radius:9999px;background:#1b7a43;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 16c2-6 6-9 12-9M8 20c1.5-4.5 4.5-7 9-7" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="18" cy="6" r="3.2" fill="#ffffff"/>
      </svg>
    </div>
    ${label ? `<div style="position:absolute;top:38px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:600;color:#14532d;background:#ffffffdd;padding:1px 6px;border-radius:6px">${escapeHtml(label)}</div>` : ""}
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
