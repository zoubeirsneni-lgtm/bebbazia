"use client";

// Carte de suivi client — Bloc 3 (CDC #48, #132, #133)
// S'appuie EXCLUSIVEMENT sur l'adaptateur map-adapter (aucun import Leaflet
// direct ici) : basculer de fournisseur plus tard ne touchera que l'adaptateur.
// • Position livreur : mise à jour SANS recréation de marqueur (polling 10 s)
// • Destination : marqueur pin si l'adresse a pu être géocodée (CDC #47 géré :
//   non géocodable → message explicite, la carte reste utilisable)
// • Distance/ETA : estimation honnête étiquetée « à vol d'oiseau » — jamais
//   présentée comme un itinéraire routier.
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { getMapProvider, type MapMarkerHandle, type MapProvider } from "@/lib/map-adapter";

export interface TrackMapProps {
  driverPosition: { lat: number; lng: number; recordedAt: string } | null;
  destination: { resolved: boolean; lat: number | null; lng: number | null };
  driverName: string | null;
  distanceKm: number | null;
  etaMinutes: number | null;
}

export function TrackMap({ driverPosition, destination, driverName, distanceKm, etaMinutes }: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const providerRef = useRef<MapProvider | null>(null);
  const driverMarkerRef = useRef<MapMarkerHandle | null>(null);
  const destMarkerRef = useRef<MapMarkerHandle | null>(null);
  const fittedRef = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialisation unique de la carte
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || providerRef.current) return;

    // Centre initial : position connue, sinon destination, sinon Tunis
    const center = driverPosition ?? (destination.resolved && destination.lat != null && destination.lng != null
      ? { lat: destination.lat, lng: destination.lng }
      : { lat: 36.8065, lng: 10.1815 });

    const provider = getMapProvider();
    provider
      .init(container, { center, zoom: 14 })
      .then(() => {
        if (cancelled) {
          provider.destroy();
          return;
        }
        providerRef.current = provider;
        if (destination.resolved && destination.lat != null && destination.lng != null) {
          destMarkerRef.current = provider.addMarker(destination.lat, destination.lng, {
            variant: "destination",
            label: "Adresse de livraison",
          });
        }
        if (driverPosition) {
          driverMarkerRef.current = provider.addMarker(driverPosition.lat, driverPosition.lng, {
            variant: "driver",
            label: driverName ? `Livreur : ${driverName}` : "Livreur",
          });
        }
        setMapError(null);
      })
      .catch(() => {
        setMapError("La carte n'a pas pu être chargée. La position textuelle reste disponible ci-dessous.");
      });

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      providerRef.current = null;
      driverMarkerRef.current = null;
      destMarkerRef.current = null;
      fittedRef.current = false;
    };
    // L'initialisation ne doit pas rejouer à chaque tick de position.
  }, []);

  // Mise à jour de la position livreur sans recréation
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || !driverPosition) return;
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = provider.addMarker(driverPosition.lat, driverPosition.lng, {
        variant: "driver",
        label: driverName ? `Livreur : ${driverName}` : "Livreur",
      });
    } else {
      driverMarkerRef.current.update(driverPosition.lat, driverPosition.lng);
    }
    if (!fittedRef.current && destMarkerRef.current) {
      provider.fitAll();
      fittedRef.current = true;
    }
  }, [driverPosition?.lat, driverPosition?.lng, driverPosition?.recordedAt]);

  // Mise à jour de la destination (géocodage asynchrone possible après chargement)
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || !destination.resolved || destination.lat == null || destination.lng == null) return;
    if (!destMarkerRef.current) {
      destMarkerRef.current = provider.addMarker(destination.lat, destination.lng, {
        variant: "destination",
        label: "Adresse de livraison",
      });
    }
  }, [destination.resolved, destination.lat, destination.lng]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          Suivi en direct
        </h2>
        {driverPosition && (
          <p className="text-xs text-muted-foreground">
            Position du livreur mise à jour toutes les 10 secondes.
          </p>
        )}
        {!driverPosition && (
          <p className="text-xs text-muted-foreground">
            En attente de la première position transmise par le livreur…
          </p>
        )}
      </div>

      {mapError ? (
        <div className="flex items-center justify-center bg-muted/40 p-6 text-sm text-muted-foreground">
          {mapError}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-[320px] w-full bg-muted/40"
          role="application"
          aria-label="Carte de suivi de la livraison"
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs text-muted-foreground">
        {distanceKm != null && (
          <span>
            Distance restante (estimation à vol d&apos;oiseau) : <strong className="text-foreground">{distanceKm} km</strong>
          </span>
        )}
        {etaMinutes != null && (
          <span>
            Arrivée estimée : <strong className="text-foreground">~{etaMinutes} min</strong>
          </span>
        )}
        {!destination.resolved && (
          <span className="text-amber-600">
            Adresse non localisée sur la carte — le suivi du livreur reste actif.
          </span>
        )}
      </div>
    </div>
  );
}

export default TrackMap;
