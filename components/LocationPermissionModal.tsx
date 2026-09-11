"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Globe,
  Lock,
  Smartphone,
  CheckCircle2,
  X,
  Compass,
  Search,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LocationErrorType =
  | "insecure_lan"       // Plain HTTP over non-localhost LAN (mobile browser blocks GPS)
  | "permission_denied"  // User blocked location permission in browser
  | "position_unavailable" // Device GPS toggle is OFF
  | "timeout"            // GPS hardware fix took too long
  | "unsupported"        // Browser lacks Geolocation API
  | "prompt";            // Initial request needed / location mandatory

interface LocationPermissionModalProps {
  open: boolean;
  onClose: () => void;
  errorType: LocationErrorType;
  onRetry: () => void;
  onPickOnMap: () => void;
  onSelectCity?: (coords: [number, number], cityName: string) => void;
  onUseNetworkLocation?: () => void;
  onUseSavedLocation?: () => void;
  hasSavedLocation?: boolean;
  hasCurrentLocation?: boolean;
  locating?: boolean;
}

export const POPULAR_CITIES = [
  { name: "Vrindavan / Mathura", state: "Uttar Pradesh", lat: 27.5815, lng: 77.6975, isHoly: true },
  { name: "Ayodhya Dham", state: "Uttar Pradesh", lat: 26.7922, lng: 82.1998, isHoly: true },
  { name: "Varanasi (Kashi)", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, isHoly: true },
  { name: "Haridwar", state: "Uttarakhand", lat: 29.9457, lng: 78.1642, isHoly: true },
  { name: "Rishikesh", state: "Uttarakhand", lat: 30.0869, lng: 78.2676, isHoly: true },
  { name: "Prayagraj (Triveni)", state: "Uttar Pradesh", lat: 25.4358, lng: 81.8463, isHoly: true },
  { name: "Ujjain (Mahakal)", state: "Madhya Pradesh", lat: 23.1765, lng: 75.7885, isHoly: true },
  { name: "Puri (Jagannath)", state: "Odisha", lat: 19.8135, lng: 85.8312, isHoly: true },
  { name: "Amritsar (Golden Temple)", state: "Punjab", lat: 31.634, lng: 74.8723, isHoly: true },
  { name: "Shirdi (Sai Dham)", state: "Maharashtra", lat: 19.7668, lng: 74.4762, isHoly: true },
  { name: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, isHoly: true },
  { name: "Delhi NCR", state: "National Capital", lat: 28.6139, lng: 77.209, isHoly: false },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, isHoly: false },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, isHoly: false },
  { name: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, isHoly: false },
  { name: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, isHoly: false },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, isHoly: false },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, isHoly: false },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, isHoly: false },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, isHoly: false },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, isHoly: false },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, isHoly: false },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, isHoly: false },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, isHoly: false },
  { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, isHoly: false },
  { name: "Chandigarh", state: "Punjab / Haryana", lat: 30.7333, lng: 76.7794, isHoly: false },
  { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, isHoly: false },
];

export default function LocationPermissionModal({
  open,
  onClose,
  errorType,
  onRetry,
  onPickOnMap,
  onSelectCity,
  onUseNetworkLocation,
  onUseSavedLocation,
  hasSavedLocation,
  hasCurrentLocation,
  locating,
}: LocationPermissionModalProps) {
  const [citySearch, setCitySearch] = useState("");
  const [tab, setTab] = useState<"diagnostics" | "cities">("diagnostics");

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return POPULAR_CITIES;
    const q = citySearch.toLowerCase();
    return POPULAR_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [citySearch]);

  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("10.")));

  const isHttpLan =
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  const handleSwitchToHttps = () => {
    if (typeof window !== "undefined") {
      window.location.href = window.location.href.replace("http:", "https:");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full sm:max-w-lg bg-card border border-border/90 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom-6 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Compass className={cn("w-6 h-6", locating && "animate-spin")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">
                  Location Required
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                  Mandatory
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bhandara Setu needs your location to display real-time food drives near you.
              </p>
            </div>
          </div>

          {hasCurrentLocation && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher: Issue Help vs City Picker (Only enabled in development / local testing) */}
        {isDevelopment && (
          <div className="flex border-b border-border/60 px-4 pt-2 bg-muted/10 gap-2 text-xs font-semibold">
            <button
              onClick={() => setTab("diagnostics")}
              className={cn(
                "pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5",
                tab === "diagnostics"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Diagnosis & Solutions</span>
            </button>
            <button
              onClick={() => setTab("cities")}
              className={cn(
                "pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5",
                tab === "cities"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Select City / Dham ({POPULAR_CITIES.length})</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          {tab === "diagnostics" ? (
            <>
              {/* Insecure LAN HTTP restriction */}
              {errorType === "insecure_lan" && (
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Mobile Browser HTTP Security Restriction</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Mobile Chrome & Safari block hardware GPS when accessing through plain HTTP (<code className="bg-background/80 px-1 py-0.5 rounded text-[11px] font-mono">http://192.168.x.x:3000</code>).
                  </p>
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="font-semibold text-foreground">Fastest ways to proceed:</div>
                    {isHttpLan && (
                      <button
                        onClick={handleSwitchToHttps}
                        className="w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Switch to HTTPS (Enables Native Mobile GPS)</span>
                      </button>
                    )}
                    <div className="p-2.5 rounded-xl bg-background/60 border border-border/60 text-muted-foreground space-y-1">
                      <div className="font-medium text-foreground">Other options:</div>
                      <div>• <strong>Production</strong> (e.g. Render / Vercel) runs on HTTPS, so GPS prompts work automatically out of the box!</div>
                      <div>• Or tap <strong>&quot;Pick on Map&quot;</strong> or <strong>&quot;Select City&quot;</strong> below for instant setup.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Permission Denied by User */}
              {errorType === "permission_denied" && (
                <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-xs">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Location Permission Blocked in Browser</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Your browser previously blocked location access for this site.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-xl bg-background/60 border border-border/60">
                    <div className="font-bold text-foreground">How to unblock in 2 steps:</div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span>Tap the <strong>lock icon 🔒</strong> (or site settings) in your browser address bar.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span>Change <strong>Location</strong> to <strong>Allow</strong>.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <span>Then tap the <strong>Request Location Again</strong> button below.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Device GPS Switched OFF */}
              {errorType === "position_unavailable" && (
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>Phone Hardware GPS is Switched OFF</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Your device location services are turned off in system settings.
                  </p>
                  <div className="p-3 rounded-xl bg-background/60 border border-border/60 text-xs text-muted-foreground">
                    Pull down your phone&apos;s quick notification bar, tap the <strong>Location / GPS toggle ON</strong>, then tap <strong>Request Location Again</strong> below.
                  </div>
                </div>
              )}

              {/* Weak Signal / Timeout */}
              {errorType === "timeout" && (
                <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>GPS Satellite Fix Timed Out</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    The GPS chip couldn&apos;t lock satellite coordinates in time. Moving closer to an open window or turning on Wi-Fi will help acquire a faster fix.
                  </p>
                </div>
              )}

              {/* General Prompt / Location Mandatory */}
              {errorType === "prompt" && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>Real-time Proximity Discovery</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Bhandara Setu locates free meals, langars, and community food drives within your reach. Please allow location access to continue.
                  </p>
                </div>
              )}

              {/* Fast City Selection Teaser (Development Only) */}
              {isDevelopment && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground">Visiting a holy city or different area?</div>
                    <div className="text-[11px] text-muted-foreground">Select from Vrindavan, Ayodhya, Kashi, Delhi, etc.</div>
                  </div>
                  <button
                    onClick={() => setTab("cities")}
                    className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors shrink-0"
                  >
                    Choose City →
                  </button>
                </div>
              )}
            </>
          ) : (
            /* City Picker Tab */
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search city, dham, or state..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto scrollbar-thin p-1">
                {filteredCities.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => {
                      if (onSelectCity) {
                        onSelectCity([city.lat, city.lng], city.name);
                      }
                      onClose();
                    }}
                    className="text-left p-2.5 rounded-xl bg-card hover:bg-primary/15 hover:border-primary/50 border border-border/70 transition-all text-xs flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">{city.name}</div>
                        <div className="text-[10px] text-muted-foreground">{city.state}</div>
                      </div>
                    </div>
                    {city.isHoly && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                        Dham 🛕
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex flex-col gap-2">
          {/* Primary Action: Re-request GPS */}
          <button
            onClick={onRetry}
            disabled={locating}
            className="w-full py-3 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 active:scale-98 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", locating && "animate-spin")} />
            <span>{locating ? "Acquiring GPS Signal…" : "Request Location Again (Try Again)"}</span>
          </button>

          <div className={cn("grid gap-2", isDevelopment ? "grid-cols-2" : "grid-cols-1")}>
            {/* Pick location directly on map */}
            <button
              onClick={() => {
                onPickOnMap();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span>Pick on Map</span>
            </button>

            {/* Quick Cities Tab shortcut (Development only) */}
            {isDevelopment && (
              <button
                onClick={() => setTab(tab === "cities" ? "diagnostics" : "cities")}
                className="py-2.5 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span>{tab === "cities" ? "View Diagnosis" : "Choose City"}</span>
              </button>
            )}
          </div>

          {/* Optional: Use previous saved location if available */}
          {hasSavedLocation && onUseSavedLocation && (
            <button
              onClick={() => {
                onUseSavedLocation();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl border border-border/70 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Use Previously Saved Location</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
