"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import { createBhandaraIcon, mapTileLayer } from "@/lib/map-icons";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full bg-muted/20 animate-pulse" />;
  }

  const position: [number, number] = [location.lat, location.lng];

  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden border">
      <MapContainer
        center={position}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer {...mapTileLayer} />
        <MapAttribution />
        <Marker position={position} icon={createBhandaraIcon()} />
        <MapEvents onMapClick={onMapClick} />
        <Recenter location={location} />
      </MapContainer>
    </div>
  );
}

