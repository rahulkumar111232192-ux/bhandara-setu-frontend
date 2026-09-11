"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Bhandara, FilterState, PostCategory, CATEGORY_MAP } from "@/lib/types";
import FeedCard from "./FeedCard";
import {
  ChevronRight,
  MapPin,
  ChevronLeft,
  PlusCircle,
  Search,
  X,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedPanelProps {
  bhandaras: Bhandara[];
  selectedId: number | null;
  hoveredId: number | null;
  onSelect: (b: Bhandara) => void;
  onHover: (id: number | null) => void;
  userLocation?: [number, number] | null;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  mobileSnap?: "min" | "half" | "max";
  onMobileSnapChange?: (snap: "min" | "half" | "max") => void;
}

const CATEGORIES: PostCategory[] = ["temple", "community", "ngo", "corporate", "personal", "other"];

export default function FeedPanel({
  bhandaras,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  userLocation,
  filters,
  onFiltersChange,
  searchTerm,
  onSearchChange,
  mobileSnap: controlledMobileSnap,
  onMobileSnapChange,
}: FeedPanelProps) {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [localMobileSnap, setLocalMobileSnap] = useState<"min" | "half" | "max">("half");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const mobileSnap = controlledMobileSnap ?? localMobileSnap;
  const setMobileSnap = (snap: "min" | "half" | "max") => {
    setLocalMobileSnap(snap);
    if (onMobileSnapChange) {
      onMobileSnapChange(snap);
    }
  };

  const cycleMobileSnap = () => {
    if (mobileSnap === "min") setMobileSnap("half");
    else if (mobileSnap === "half") setMobileSnap("max");
    else setMobileSnap("min");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (diff < -35) {
      // Swiped UP -> expand
      if (mobileSnap === "min") setMobileSnap("half");
      else if (mobileSnap === "half") setMobileSnap("max");
    } else if (diff > 35) {
      // Swiped DOWN -> collapse
      if (mobileSnap === "max") setMobileSnap("half");
      else if (mobileSnap === "half") setMobileSnap("min");
    }
  };

  const activeCount = bhandaras.filter((b) => b.isLive).length;
  const upcomingCount = bhandaras.filter(
    (b) => b.isUpcoming || b.status?.toLowerCase() === "upcoming"
  ).length;

  // Status Filter Handlers
  const currentStatus = filters.status.length === 1 ? filters.status[0] : "all";

  const handleStatusSelect = (status: "all" | "live" | "upcoming" | "ended") => {
    if (status === "all") {
      onFiltersChange({ ...filters, status: [] });
    } else {
      onFiltersChange({ ...filters, status: [status] });
    }
  };

  const handleCategoryToggle = (cat: PostCategory) => {
    const exists = filters.category.includes(cat);
    let next: PostCategory[];
    if (exists) {
      next = filters.category.filter((c) => c !== cat);
    } else {
      next = [...filters.category, cat];
    }
    onFiltersChange({ ...filters, category: next });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      ...filters,
      status: [],
      category: [],
      verifiedOnly: false,
      hasImage: false,
    });
    onSearchChange("");
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.category.length > 0 ||
    filters.verifiedOnly ||
    filters.hasImage ||
    searchTerm.trim().length > 0;

  return (
    <>
      {/* ── DESKTOP RIGHT PANEL ── */}
      <div
        className={cn(
          "hidden md:flex flex-col fixed right-4 top-4 bottom-4 z-[900] glass rounded-3xl transition-all duration-300 shadow-2xl border border-border/60 backdrop-blur-xl",
          isDesktopCollapsed ? "w-[64px]" : "w-[410px]"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border/40 shrink-0">
          {!isDesktopCollapsed && (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline font-bold text-base text-foreground">
                  🍛 Free Meals Nearby
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {bhandaras.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activeCount > 0 ? (
                  <span className="text-green-600 font-semibold">🟢 {activeCount} Live Now</span>
                ) : (
                  "No active meals right now"
                )}
                {upcomingCount > 0 && ` · ⏳ ${upcomingCount} Upcoming`}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="p-2 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mx-auto"
            title={isDesktopCollapsed ? "Expand feed panel" : "Collapse feed panel"}
          >
            {isDesktopCollapsed ? (
              <div className="flex flex-col items-center">
                <ChevronLeft className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-bold mt-1 text-primary">{activeCount}</span>
              </div>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Filter Controls on Desktop */}
        {!isDesktopCollapsed && (
          <div className="p-3 border-b border-border/40 space-y-2.5 shrink-0 bg-muted/10">
            {/* Status Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/40 gap-1 text-xs font-semibold">
              <button
                onClick={() => handleStatusSelect("all")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg transition-all text-center",
                  currentStatus === "all"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => handleStatusSelect("live")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1",
                  currentStatus === "live"
                    ? "bg-green-500/20 text-green-700 dark:text-green-300 shadow-xs font-bold border border-green-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Live
              </button>
              <button
                onClick={() => handleStatusSelect("upcoming")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1",
                  currentStatus === "upcoming"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs font-bold border border-amber-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Upcoming
              </button>
              <button
                onClick={() => handleStatusSelect("ended")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg transition-all text-center",
                  currentStatus === "ended"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Ended
              </button>
            </div>

            {/* Category Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                onClick={() => onFiltersChange({ ...filters, category: [] })}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                  filters.category.length === 0
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card hover:bg-muted text-muted-foreground border-border/60"
                )}
              >
                All Types
              </button>
              {CATEGORIES.map((cat) => {
                const conf = CATEGORY_MAP[cat];
                const active = filters.category.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryToggle(cat)}
                    className={cn(
                      "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                      active
                        ? "bg-primary/20 text-primary border-primary/50 shadow-xs"
                        : "bg-card hover:bg-muted text-muted-foreground border-border/60"
                    )}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Feed List (Desktop) */}
        {!isDesktopCollapsed && (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5">
            {bhandaras.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-3 px-4 py-8">
                <div className="p-3 rounded-full bg-muted/50">
                  <MapPin className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {hasActiveFilters ? "No meals match the selected filters" : "No free meals found nearby"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Try clearing filters to see all available community meals."
                    : "Be the first to share a free meal listing in this area!"}
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs font-semibold hover:bg-muted transition-all"
                  >
                    Clear All Filters
                  </button>
                ) : (
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" /> Share a Free Meal
                  </Link>
                )}
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

      {/* ── MOBILE SHUTTER (3-SNAP: Min ~60px, Half 48vh, Max ~72vh below top floating bar) ── */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-[900] glass rounded-t-3xl flex flex-col transition-all duration-300 shadow-[0_-10px_35px_rgba(0,0,0,0.2)] border-t border-border/60 bg-background/95 backdrop-blur-xl",
          mobileSnap === "min" && "h-[62px]",
          mobileSnap === "half" && "h-[48vh]",
          mobileSnap === "max" && "h-[calc(100dvh-135px)] max-h-[72vh]"
        )}
      >
        {/* Shutter Drag Handle & Controls Bar (Touch Drawable) */}
        <div
          className="w-full shrink-0 pt-2 pb-1.5 px-4 border-b border-border/30 bg-muted/20 select-none touch-none cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top handle pill */}
          <div
            className="w-full flex justify-center py-1 cursor-pointer"
            onClick={cycleMobileSnap}
            title="Tap or drag to resize shutter"
          >
            <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full mx-auto" />
          </div>

          {/* Shutter Header & 3-Snap Selector */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={cycleMobileSnap}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-xs text-foreground truncate">
                  🍛 Free Meals ({bhandaras.length})
                </span>
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-green-500/20 text-green-700 dark:text-green-300">
                    🟢 {activeCount} Live
                  </span>
                )}
                {upcomingCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    ⏳ {upcomingCount}
                  </span>
                )}
              </div>
            </div>

            {/* Direct Snap Buttons: Min | Half | Full */}
            <div className="flex items-center bg-muted/80 rounded-lg p-0.5 border border-border/50 text-[10px] font-semibold shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileSnap("min");
                }}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  mobileSnap === "min"
                    ? "bg-card text-foreground font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Minimize shutter to peek bar"
              >
                Peek
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileSnap("half");
                }}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  mobileSnap === "half"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Half screen (see map and list together)"
              >
                50%
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileSnap("max");
                }}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  mobileSnap === "max"
                    ? "bg-card text-foreground font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Expand full shutter"
              >
                Full
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Shutter Content (Visible in Half and Max) */}
        {mobileSnap !== "min" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Inline Filter Tabs Bar for Mobile */}
            <div className="px-3 py-2 border-b border-border/40 shrink-0 bg-muted/10 space-y-2">
              {/* Status Segment */}
              <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/40 gap-1 text-xs font-semibold">
                <button
                  onClick={() => handleStatusSelect("all")}
                  className={cn(
                    "flex-1 py-1 rounded-lg transition-all text-center",
                    currentStatus === "all"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => handleStatusSelect("live")}
                  className={cn(
                    "flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1",
                    currentStatus === "live"
                      ? "bg-green-500/20 text-green-700 dark:text-green-300 shadow-xs font-bold border border-green-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live
                </button>
                <button
                  onClick={() => handleStatusSelect("upcoming")}
                  className={cn(
                    "flex-1 py-1 rounded-lg transition-all text-center flex items-center justify-center gap-1",
                    currentStatus === "upcoming"
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs font-bold border border-amber-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Upcoming
                </button>
                <button
                  onClick={() => handleStatusSelect("ended")}
                  className={cn(
                    "flex-1 py-1 rounded-lg transition-all text-center",
                    currentStatus === "ended"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Ended
                </button>
              </div>

              {/* Horizontal Scrollable Category Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  onClick={() => onFiltersChange({ ...filters, category: [] })}
                  className={cn(
                    "shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border",
                    filters.category.length === 0
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground border-border/60"
                  )}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => {
                  const conf = CATEGORY_MAP[cat];
                  const active = filters.category.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryToggle(cat)}
                      className={cn(
                        "shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border",
                        active
                          ? "bg-primary/20 text-primary border-primary/50 font-bold"
                          : "bg-card text-muted-foreground border-border/60"
                      )}
                    >
                      <span>{conf.icon}</span>
                      <span>{conf.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Feed List on Mobile */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2.5 pb-20">
              {bhandaras.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2 px-4">
                  <MapPin className="w-8 h-8 text-primary/60" />
                  <p className="text-sm font-semibold text-foreground">No free meals found</p>
                  <p className="text-xs">
                    {hasActiveFilters
                      ? "Try clearing filters to see all listings."
                      : "Be the first in this area to share one!"}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      onClick={clearAllFilters}
                      className="mt-1 px-3 py-1 rounded-xl bg-card border border-border text-foreground text-xs font-semibold"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      href="/submit"
                      className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Share Meal
                    </Link>
                  )}
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
          </div>
        )}
      </div>
    </>
  );
}
