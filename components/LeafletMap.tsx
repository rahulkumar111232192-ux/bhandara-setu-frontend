"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import type { Bhandara } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/types";
import {
  createBhandaraIcon,
  createUserLocationIcon,
  lightTileLayer,
  darkTileLayer,
} from "@/lib/map-icons";
import { useTheme } from "@/components/ThemeProvider";
import { renderPopupHtml } from "@/components/MarkerPopupPreview";
import dynamic from "next/dynamic";

const DarkVectorMap = dynamic(() => import("@/components/DarkVectorMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#12110f] animate-pulse flex items-center justify-center">
      <span className="text-amber-500 text-sm font-medium">Loading Amber Vector Map...</span>
    </div>
  ),
});

/* ── Subcomponent: syncs map view with parent state ── */
function MapController({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);
  return null;
}

function MapAttribution() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix("");
  }, [map]);

  return null;
}

function MapEventsHandler({ onMapClick }: { onMapClick?: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

/* ── Subcomponent: individual bhandara marker ── */
function BhandaraMarker({
  bhandara,
  isHovered,
  isSelected,
  userLocation,
  onMarkerClick,
  onMarkerHover,
}: {
  bhandara: Bhandara;
  isHovered: boolean;
  isSelected: boolean;
  userLocation: [number, number] | null;
  onMarkerClick: (b: Bhandara) => void;
  onMarkerHover: (id: number | null) => void;
}) {
  const state = isSelected ? "selected" : isHovered ? "hovered" : "default";
  const catColor = bhandara.category && CATEGORY_MAP[bhandara.category]
    ? CATEGORY_MAP[bhandara.category].color
    : undefined;

  const isUpcoming = Boolean(bhandara.isUpcoming || bhandara.status?.toLowerCase() === "upcoming");
  const icon = useMemo(
    () => createBhandaraIcon(state, catColor, bhandara.isLive, isUpcoming),
    [state, catColor, bhandara.isLive, isUpcoming]
  );

  return (
    <Marker
      position={[bhandara.latitude, bhandara.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onMarkerClick(bhandara),
        mouseover: () => onMarkerHover(bhandara.id),
        mouseout: () => onMarkerHover(null),
      }}
    >
      {isHovered && !isSelected && (
        <Popup autoPan={false} closeButton={false} autoClose={false}>
          <div
            dangerouslySetInnerHTML={{
              __html: renderPopupHtml(bhandara, userLocation),
            }}
          />
        </Popup>
      )}
    </Marker>
  );
}

/* ── Main LeafletMap component ── */
interface LeafletMapProps {
  center: LatLngExpression;
  zoom: number;
  bhandaras: Bhandara[];
  userLocation: [number, number] | null;
  onMarkerClick: (b: Bhandara) => void;
  onMarkerHover: (id: number | null) => void;
  hoveredId: number | null;
  selectedId: number | null;
  onMapClick?: (coords: [number, number]) => void;
}

export default function LeafletMap({
  center,
  zoom,
  bhandaras,
  onMarkerClick,
  onMarkerHover,
  userLocation,
  hoveredId,
  selectedId,
  onMapClick,
}: LeafletMapProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const { theme } = useTheme();

  const tileLayer = theme === "dark" ? darkTileLayer : lightTileLayer;

  useEffect(() => {
    const container = L.DomUtil.get("bhandara-map-root");
    if (container !== null) {
      // @ts-ignore — clear stale Leaflet instance on hot reload
      container._leaflet_id = null;
    }

    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 50);

    return () => {
      clearTimeout(timer);
      setShouldRender(false);
      const c = L.DomUtil.get("bhandara-map-root");
      if (c !== null) {
        // @ts-ignore
        c._leaflet_id = null;
      }
    };
  }, []);

  if (!shouldRender) {
    return (
      <div className="h-full w-full bg-muted/20 animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">
          Initializing Map...
        </span>
      </div>
    );
  }

  if (theme === "dark") {
    return (
      <div key="vector-map-dark" className="h-full w-full relative overflow-hidden">
        <DarkVectorMap
          center={center}
          zoom={zoom}
          bhandaras={bhandaras}
          userLocation={userLocation}
          onMarkerClick={onMarkerClick}
          onMarkerHover={onMarkerHover}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onMapClick={onMapClick ? ({ lat, lng }) => onMapClick([lat, lng]) : undefined}
        />
      </div>
    );
  }

  return (
    <div key="leaflet-map-light" className="h-full w-full relative overflow-hidden">
      <MapContainer
        id="bhandara-map-root"
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer key={theme} {...tileLayer} />
        <MapAttribution />
        <MapController center={center} zoom={zoom} />
        <MapEventsHandler onMapClick={onMapClick} />

        {userLocation && (
          <Marker position={userLocation} icon={createUserLocationIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {bhandaras.map((b) => (
          <BhandaraMarker
            key={b.id}
            bhandara={b}
            isHovered={hoveredId === b.id}
            isSelected={selectedId === b.id}
            userLocation={userLocation}
            onMarkerClick={onMarkerClick}
            onMarkerHover={onMarkerHover}
          />
        ))}
      </MapContainer>
    </div>
  );
}
