"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Protocol } from "pmtiles";
import type { Bhandara } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/types";
import { createBhandaraIcon, createUserLocationIcon } from "@/lib/map-icons";
import { renderPopupHtml } from "@/components/MarkerPopupPreview";

const VECTOR_STYLE_URL =
  "https://tiles.openfreemap.org/styles/dark";

const DARK_COLORS = {
  background: "#111318",
  roads: "#3F3423",
  majorRoads: "#D97706",
  highways: "#F59E0B",
  water: "#0B1F33",
  buildings: "#1B1F27",
  labels: "#CBD5E1",
};

function colorForLayer(layerId: string, sourceLayer: string | undefined) {
  const value = `${layerId} ${sourceLayer ?? ""}`.toLowerCase();
  if (value.includes("water")) return DARK_COLORS.water;
  if (value.includes("building")) return DARK_COLORS.buildings;
  if (value.includes("motorway") || value.includes("highway")) return DARK_COLORS.highways;
  if (value.includes("trunk") || value.includes("primary") || value.includes("major")) {
    return DARK_COLORS.majorRoads;
  }
  return DARK_COLORS.roads;
}

interface DarkVectorMapProps {
  center: [number, number];
  zoom: number;
  bhandaras: Bhandara[];
  userLocation: [number, number] | null;
  onMarkerClick: (bhandara: Bhandara) => void;
  onMarkerHover: (id: number | null) => void;
  hoveredId: number | null;
  selectedId: number | null;
}

export default function DarkVectorMap({
  center,
  zoom,
  bhandaras,
  userLocation,
  onMarkerClick,
  onMarkerHover,
  hoveredId,
  selectedId,
}: DarkVectorMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [protocolReady, setProtocolReady] = useState(false);

  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    setProtocolReady(true);
    return () => maplibregl.removeProtocol("pmtiles");
  }, []);

  useEffect(() => {
    mapRef.current?.flyTo({ center: [center[1], center[0]], zoom, duration: 500 });
  }, [center, zoom]);

  const markerIcons = useMemo(
    () => ({
      default: createBhandaraIcon(),
      hovered: createBhandaraIcon("hovered"),
      selected: createBhandaraIcon("selected"),
      user: createUserLocationIcon(),
    }),
    []
  );

  if (!protocolReady) return <div className="h-full w-full bg-[#111318]" />;

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: center[1], latitude: center[0], zoom }}
      mapStyle={VECTOR_STYLE_URL}
      mapLib={maplibregl}
      onLoad={(event) => {
        const map = event.target as MapLibreMap;
        for (const layer of map.getStyle().layers) {
          const sourceLayer = "source-layer" in layer ? layer["source-layer"] : undefined;
          const color = colorForLayer(layer.id, sourceLayer);
          if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", DARK_COLORS.background);
          if (layer.type === "symbol") {
            map.setPaintProperty(layer.id, "text-color", DARK_COLORS.labels);
            map.setPaintProperty(layer.id, "text-halo-color", DARK_COLORS.background);
          }
          if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", color);
          if (layer.type === "line") map.setPaintProperty(layer.id, "line-color", color);
        }
      }}
      attributionControl={{ compact: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {userLocation && (
        <Marker longitude={userLocation[1]} latitude={userLocation[0]}>
          <div
            aria-label="Your location"
            dangerouslySetInnerHTML={{ __html: markerIcons.user.options.html as string }}
          />
        </Marker>
      )}

      {bhandaras.map((bhandara) => {
        const markerState = selectedId === bhandara.id ? "selected" : hoveredId === bhandara.id ? "hovered" : "default";
        const catColor = bhandara.category && CATEGORY_MAP[bhandara.category]
          ? CATEGORY_MAP[bhandara.category].color
          : undefined;
        const iconHtml = createBhandaraIcon(markerState, catColor, bhandara.isLive).options.html as string;

        return (
          <Marker
            key={bhandara.id}
            longitude={bhandara.longitude}
            latitude={bhandara.latitude}
            anchor="center"
            onClick={() => onMarkerClick(bhandara)}
          >
            <div
              onMouseEnter={() => onMarkerHover(bhandara.id)}
              onMouseLeave={() => onMarkerHover(null)}
              dangerouslySetInnerHTML={{ __html: iconHtml }}
            />
            {hoveredId === bhandara.id && selectedId !== bhandara.id && (
              <Popup
                longitude={bhandara.longitude}
                latitude={bhandara.latitude}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={24}
              >
                <div dangerouslySetInnerHTML={{ __html: renderPopupHtml(bhandara, userLocation) }} />
              </Popup>
            )}
          </Marker>
        );
      })}
    </Map>
  );
}
