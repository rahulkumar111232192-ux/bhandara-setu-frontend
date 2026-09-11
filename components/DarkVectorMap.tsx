"use client";

import { useEffect, useRef, useMemo } from "react";
import * as maplibregl from "maplibre-gl";
import type { Bhandara } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/types";
import { createBhandaraIcon, createUserLocationIcon } from "@/lib/map-icons";
import { renderPopupHtml } from "@/components/MarkerPopupPreview";
import { amberDarkVectorStyle } from "@/lib/amber-dark-style";

interface DarkVectorMapProps {
  center: [number, number] | { lat: number; lng: number } | any;
  zoom: number;
  bhandaras?: Bhandara[];
  userLocation?: [number, number] | null;
  onMarkerClick?: (bhandara: Bhandara) => void;
  onMarkerHover?: (id: number | null) => void;
  hoveredId?: number | null;
  selectedId?: number | null;
  singleMarker?: { lat: number; lng: number } | null;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  className?: string;
}

/**
 * Normalizes coordinates to MapLibre's [longitude, latitude] format
 * Handles array [lat, lng] from Leaflet or object { lat, lng } / { latitude, longitude }
 */
function normalizeToLngLat(pos: any): [number, number] {
  if (!pos) return [77.209, 28.6139];
  if (Array.isArray(pos)) {
    return [pos[1], pos[0]];
  }
  if (typeof pos === "object") {
    const lat = pos.lat ?? pos.latitude;
    const lng = pos.lng ?? pos.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return [lng, lat];
    }
  }
  return [77.209, 28.6139];
}

export default function DarkVectorMap({
  center,
  zoom,
  bhandaras = [],
  userLocation,
  onMarkerClick,
  onMarkerHover,
  hoveredId,
  selectedId,
  singleMarker,
  onMapClick,
  className = "h-full w-full relative overflow-hidden",
}: DarkVectorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const singleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [lng, lat] = useMemo(() => normalizeToLngLat(center), [center]);

  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  const onMarkerHoverRef = useRef(onMarkerHover);
  onMarkerHoverRef.current = onMarkerHover;

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: amberDarkVectorStyle as any,
      center: [lng, lat],
      zoom: zoom,
      attributionControl: { compact: true },
    });

    if (typeof window !== "undefined") {
      (window as any)._map = map;
    }

    map.on("error", (e) => {
      console.error("MAPLIBRE ERROR EVENT:", e);
    });

    map.on("load", () => {
      console.log("MAPLIBRE LOAD EVENT FIRED");
    });


    map.on("click", (e) => {
      onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center / zoom
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: zoom,
      duration: 600,
      essential: true,
    });
  }, [lng, lat, zoom]);

  // Update cursor
  useEffect(() => {
    if (!mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    if (canvas) {
      canvas.style.cursor = onMapClick ? "crosshair" : "";
    }
  }, [onMapClick]);

  // Single marker (for Submit / Create form)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (singleMarker) {
      const pinHtml = createBhandaraIcon("selected").options.html as string;
      if (!singleMarkerRef.current) {
        const el = document.createElement("div");
        el.innerHTML = pinHtml;
        singleMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([singleMarker.lng, singleMarker.lat])
          .addTo(map);
      } else {
        singleMarkerRef.current.setLngLat([singleMarker.lng, singleMarker.lat]);
      }
    } else if (singleMarkerRef.current) {
      singleMarkerRef.current.remove();
      singleMarkerRef.current = null;
    }
  }, [singleMarker]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation) {
      const iconHtml = createUserLocationIcon().options.html as string;
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.innerHTML = iconHtml;
        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([userLocation[1], userLocation[0]])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([userLocation[1], userLocation[0]]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Bhandara markers & popups
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    bhandaras.forEach((bhandara) => {
      const markerState =
        selectedId === bhandara.id
          ? "selected"
          : hoveredId === bhandara.id
          ? "hovered"
          : "default";
      const catColor =
        bhandara.category && CATEGORY_MAP[bhandara.category]
          ? CATEGORY_MAP[bhandara.category].color
          : undefined;
      const isUpcoming = Boolean(bhandara.isUpcoming || bhandara.status?.toLowerCase() === "upcoming");
      const iconHtml = createBhandaraIcon(
        markerState,
        catColor,
        bhandara.isLive,
        isUpcoming
      ).options.html as string;

      const el = document.createElement("div");
      el.className = "cursor-pointer";
      el.innerHTML = iconHtml;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onMarkerClickRef.current?.(bhandara);
      });

      el.addEventListener("mouseenter", () => {
        onMarkerHoverRef.current?.(bhandara.id);
      });

      el.addEventListener("mouseleave", () => {
        onMarkerHoverRef.current?.(null);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([bhandara.longitude, bhandara.latitude])
        .addTo(map);

      markersRef.current.push(marker);

      // Render Popup for hovered marker
      if (hoveredId === bhandara.id && selectedId !== bhandara.id) {
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: "bottom",
          offset: 24,
          className: "z-50",
        })
          .setLngLat([bhandara.longitude, bhandara.latitude])
          .setHTML(renderPopupHtml(bhandara, userLocation))
          .addTo(map);

        popupRef.current = popup;
      }
    });
  }, [bhandaras, hoveredId, selectedId, userLocation]);

  return <div ref={containerRef} className={className} />;
}


