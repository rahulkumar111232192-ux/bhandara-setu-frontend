"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import { createBhandaraIcon, lightTileLayer } from "@/lib/map-icons";
import { useTheme } from "@/components/ThemeProvider";
import dynamic from "next/dynamic";

const DarkVectorMap = dynamic(() => import("@/components/DarkVectorMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#12110f] animate-pulse flex items-center justify-center">
      <span className="text-amber-500 text-xs font-medium">Loading Amber Vector Map...</span>
    </div>
  ),
});

interface SubmitMapProps {
  location: { lat: number; lng: number };
  onMapClick: (latlng: { lat: number; lng: number }) => void;
}

function MapEvents({ onMapClick }: { onMapClick: SubmitMapProps["onMapClick"] }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function Recenter({ location }: { location: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([location.lat, location.lng]);
  }, [location.lat, location.lng, map]);
  return null;
}

function MapAttribution() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix("");
  }, [map]);

  return null;
}

export default function SubmitMap({ location, onMapClick }: SubmitMapProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full bg-muted/20 animate-pulse" />;
  }

  if (theme === "dark") {
    return (
      <div key="submit-map-dark" className="h-full w-full relative rounded-lg overflow-hidden border border-border/60">
        <DarkVectorMap
          center={location}
          zoom={13}
          singleMarker={location}
          onMapClick={onMapClick}
        />
      </div>
    );
  }

  const position: [number, number] = [location.lat, location.lng];

  return (
    <div key="submit-map-light" className="h-full w-full relative rounded-lg overflow-hidden border border-border/60">
      <MapContainer
        center={position}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer {...lightTileLayer} />
        <MapAttribution />
        <Marker position={position} icon={createBhandaraIcon()} />
        <MapEvents onMapClick={onMapClick} />
        <Recenter location={location} />
      </MapContainer>
    </div>
  );
}

