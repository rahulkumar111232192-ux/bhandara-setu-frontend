import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { Bhandara, CATEGORY_MAP } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface MarkerPopupPreviewProps {
  bhandara: Bhandara;
  userLocation?: [number, number] | null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MarkerPopupPreview({ bhandara, userLocation }: MarkerPopupPreviewProps) {
  const categoryInfo = bhandara.category && CATEGORY_MAP[bhandara.category]
    ? CATEGORY_MAP[bhandara.category]
    : CATEGORY_MAP["other"];

  const distanceKm = userLocation
    ? getDistanceKm(userLocation[0], userLocation[1], bhandara.latitude, bhandara.longitude)
    : null;

  const distanceLabel = distanceKm !== null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m away`
      : `${distanceKm.toFixed(1)} km away`
    : null;

  const walkMinutes = distanceKm !== null ? Math.round((distanceKm / 5) * 60) : null;

  return (
    <div className="w-60 rounded-2xl overflow-hidden shadow-2xl bg-card border border-border">
      {bhandara.imageUrl && (
        <div className="h-28 w-full bg-muted relative">
          <img 
            src={bhandara.imageUrl} 
            alt={bhandara.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md bg-background/80 text-foreground border border-border/40">
            {categoryInfo.icon} {categoryInfo.label}
          </div>
        </div>
      )}
      
      <div className="p-3 space-y-2">
        <div>
          <div className="flex items-center gap-1.5 justify-between">
            <h3 className="font-bold text-sm truncate text-foreground flex-1">{bhandara.title}</h3>
            {!bhandara.imageUrl && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: categoryInfo.color + "25", color: categoryInfo.darkColor || categoryInfo.color }}
              >
                {categoryInfo.icon} {categoryInfo.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {bhandara.address || "Address unavailable"}
          </p>
        </div>

        {/* Status + Distance Row */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              bhandara.isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className={cn("text-[11px] font-semibold", bhandara.isLive ? "text-green-600" : "text-muted-foreground")}>
              {bhandara.isLive ? "Live Now" : "Ended"}
            </span>
          </div>

          {distanceLabel && (
            <span className="text-[11px] font-bold text-primary flex items-center gap-0.5">
              📍 {distanceLabel}
              {walkMinutes && walkMinutes > 0 && walkMinutes <= 60 ? ` (~${walkMinutes}m walk)` : ""}
            </span>
          )}
        </div>

        {/* Menu or Food Info preview if present */}
        {bhandara.menu && (
          <div className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded-lg truncate">
            🍛 <span className="font-medium text-foreground">Menu:</span> {bhandara.menu}
          </div>
        )}

        {/* Verification / Timing footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <span>⏱ {formatTimeAgo(bhandara.created_at)}</span>
          {(bhandara.upvoteCount ?? 0) > 0 ? (
            <span className="text-green-600 font-semibold">👍 {bhandara.upvoteCount} confirmed</span>
          ) : (
            <span className="italic opacity-75">Tap for details</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function renderPopupHtml(bhandara: Bhandara, userLocation?: [number, number] | null): string {
  return ReactDOMServer.renderToStaticMarkup(
    <MarkerPopupPreview bhandara={bhandara} userLocation={userLocation} />
  );
}
