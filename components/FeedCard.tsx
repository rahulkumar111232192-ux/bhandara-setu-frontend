"use client";

import React from "react";
import { Bhandara, CATEGORY_MAP } from "@/lib/types";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  bhandara: Bhandara;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (b: Bhandara) => void;
  onHover: (id: number | null) => void;
  userLocation?: [number, number] | null;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

export default function FeedCard({
  bhandara,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  userLocation,
}: FeedCardProps) {
  const categoryInfo = bhandara.category && CATEGORY_MAP[bhandara.category]
    ? CATEGORY_MAP[bhandara.category]
    : CATEGORY_MAP["other"];

  const distanceKm = userLocation
    ? getDistanceKm(userLocation[0], userLocation[1], bhandara.latitude, bhandara.longitude)
    : null;

  const distanceLabel = distanceKm !== null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m`
      : `${distanceKm.toFixed(1)}km`
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(bhandara)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(bhandara);
        }
      }}
      onMouseEnter={() => onHover(bhandara.id)}
      onMouseLeave={() => onHover(null)}
      aria-label={`Community meal: ${bhandara.title}, ${bhandara.isLive ? 'Live now' : 'Ended'}`}
      className={cn(
        "glass-subtle rounded-2xl p-3.5 cursor-pointer transition-all duration-200 outline-none",
        "hover:scale-[1.01] hover:shadow-lg flex gap-3 border border-border/50",
        isSelected && "ring-2 ring-primary bg-primary/10 border-primary/40",
        !isSelected && isHovered && "bg-primary/5",
        !bhandara.isLive && "opacity-75"
      )}
    >
      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden relative bg-muted flex items-center justify-center shadow-xs">
        {bhandara.imageUrl ? (
          <img
            src={bhandara.imageUrl}
            alt={bhandara.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: categoryInfo.color + "25" }}
          >
            {categoryInfo.icon}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-sm truncate text-foreground flex-1">{bhandara.title}</h3>
            {distanceLabel && (
              <span className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                📍 {distanceLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
            <span className="truncate">{bhandara.address || "Location on map"}</span>
            {(bhandara.organizer?.name || bhandara.user?.name) && (
              <>
                <span className="opacity-40">·</span>
                <span className="truncate font-medium text-foreground/80 text-[11px]">
                  by {bhandara.organizer?.name || bhandara.user?.name}
                </span>
              </>
            )}
          </div>
        </div>

        {bhandara.menu && (
          <p className="text-[11px] text-muted-foreground truncate mt-1">
            🍛 <span className="font-medium text-foreground">{bhandara.menu}</span>
          </p>
        )}
        
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: categoryInfo.color + "20", color: categoryInfo.darkColor || categoryInfo.color }}
            >
              {categoryInfo.icon} {categoryInfo.label}
            </span>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  bhandara.isLive ? "bg-green-500 animate-pulse-live" : "bg-gray-400"
                )}
              />
              <span className={cn("text-[10px] font-medium", bhandara.isLive ? "text-green-600" : "text-muted-foreground")}>
                {bhandara.isLive ? "Live" : "Ended"} · {timeAgo(bhandara.created_at)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {(bhandara.upvoteCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-green-600 font-semibold">
                👍 {bhandara.upvoteCount}
              </span>
            )}
            {(bhandara.commentCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                💬 {bhandara.commentCount}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> {bhandara.watchCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
