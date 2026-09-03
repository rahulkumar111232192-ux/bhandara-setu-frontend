"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bhandara } from "@/lib/types";
import FeedCard from "./FeedCard";
import { ChevronRight, MapPin, ChevronLeft, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedPanelProps {
  bhandaras: Bhandara[];
  selectedId: number | null;
  hoveredId: number | null;
  onSelect: (b: Bhandara) => void;
  onHover: (id: number | null) => void;
  userLocation?: [number, number] | null;
}

export default function FeedPanel({
  bhandaras,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  userLocation,
}: FeedPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Default to collapsed on mobile so the map remains fully interactive
  const [mobileHeight, setMobileHeight] = useState<"collapsed" | "half" | "full">("collapsed");

  const activeCount = bhandaras.filter((b) => b.isLive).length;

  const cycleMobileHeight = () => {
    if (mobileHeight === "collapsed") setMobileHeight("half");
    else if (mobileHeight === "half") setMobileHeight("full");
    else setMobileHeight("collapsed");
  };

  return (
    <>
      {/* Desktop Panel */}
      <div
        className={cn(
          "hidden md:flex flex-col fixed right-4 top-4 bottom-4 z-[900] glass rounded-2xl transition-all duration-300 animate-slide-in-right",
          isCollapsed ? "w-[60px]" : "w-[390px]"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
          {!isCollapsed && (
            <div>
              <h2 className="font-headline font-bold text-lg">🍛 Free Meals Nearby</h2>
              <p className="text-xs text-muted-foreground">{activeCount} actively serving</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0 mx-auto"
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center">
                <ChevronLeft className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-bold mt-1 text-primary">{activeCount}</span>
              </div>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5">
            {bhandaras.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-3 px-4 py-8">
                <div className="p-3 rounded-full bg-muted/50">
                  <MapPin className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-sm font-semibold text-foreground">No free meals found in this area</p>
                <p className="text-xs text-muted-foreground">
                  Try zooming out or searching another location, or help your neighbors by adding one!
                </p>
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" /> Share a Free Meal
                </Link>
              </div>
            ) : (
              bhandaras.map((b) => (
                <FeedCard
                  key={b.id}
                  bhandara={b}
                  isSelected={b.id === selectedId}
                  isHovered={b.id === hoveredId}
                  onSelect={onSelect}
                  onHover={onHover}
                  userLocation={userLocation}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet (default collapsed so map is visible) */}
      <div
        className={cn(
          "md:hidden fixed bottom-14 left-0 right-0 z-[900] glass rounded-t-3xl flex flex-col transition-all duration-300 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] border-t border-border/50",
          mobileHeight === "collapsed" && "h-[64px]",
          mobileHeight === "half" && "h-[50vh]",
          mobileHeight === "full" && "h-[calc(100dvh-75px)]"
        )}
      >
        <div
          className="w-full flex justify-center pt-2.5 pb-1.5 cursor-pointer shrink-0"
          onClick={cycleMobileHeight}
        >
          <div className="w-12 h-1 bg-muted-foreground/40 rounded-full mx-auto" />
        </div>
        
        <div
          className="px-4 pb-2 shrink-0 flex items-center justify-between cursor-pointer"
          onClick={cycleMobileHeight}
        >
          <h2 className="font-headline font-bold text-sm">🍛 Free Meals Nearby ({activeCount} active)</h2>
          <span className="text-[11px] text-primary font-semibold">
            {mobileHeight === "collapsed" ? "Tap to view list ↑" : "Tap to collapse ↓"}
          </span>
        </div>

        {mobileHeight !== "collapsed" && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-6 space-y-2.5">
            {bhandaras.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2 px-4">
                <MapPin className="w-8 h-8 text-primary/60" />
                <p className="text-sm font-semibold text-foreground">No free meals found nearby</p>
                <p className="text-xs">Zoom out or be the first to share one!</p>
                <Link
                  href="/submit"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Share Meal
                </Link>
              </div>
            ) : (
              bhandaras.map((b) => (
                <FeedCard
                  key={b.id}
                  bhandara={b}
                  isSelected={b.id === selectedId}
                  isHovered={b.id === hoveredId}
                  onSelect={onSelect}
                  onHover={onHover}
                  userLocation={userLocation}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
