"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Bhandara, FilterState, SortOption } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import {
  Loader2,
  LocateFixed,
  Bell,
  BellRing,
  LogIn,
  Sun,
  Moon,
  AlertOctagon,
  Search,
  X,
  Plus,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import FeedPanel from "@/components/FeedPanel";
import PostDetail from "@/components/PostDetail";
import { RevolvingTitle } from "@/components/RevolvingTitle";
import LocationPermissionModal, { LocationErrorType } from "@/components/LocationPermissionModal";
import { useLivePosts } from "@/hooks/use-live-posts";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { apiFetch, getApiBaseUrl } from "@/lib/api";
import { isReminderSet } from "@/lib/reminders";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/10">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

const DEFAULT_CENTER: LatLngExpression = [28.6139, 77.209];
const LAST_LOCATION_KEY = "bhandara_user_location_v2";

export default function Home() {
  /* ── Data — live via SSE with dynamic LAN IP resolution ── */
  const { posts: allBhandaras, loading, error, updatePost } = useLivePosts("all");
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  /* ── Selection / hover sync ── */
  const [selectedBhandara, setSelectedBhandara] = useState<Bhandara | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  /* ── Search / filter / sort ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  /* ── Location Modal & Diagnostics State ── */
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationErrorType, setLocationErrorType] = useState<LocationErrorType>("prompt");
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);

  /* ── Map state with active GPS tracking ── */
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LAST_LOCATION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === "number" && typeof parsed[1] === "number") {
            return [parsed[0], parsed[1]] as [number, number];
          }
          if (parsed && Array.isArray(parsed.coords) && parsed.coords.length === 2 && typeof parsed.coords[0] === "number" && typeof parsed.coords[1] === "number") {
            return [parsed.coords[0], parsed.coords[1]] as [number, number];
          }
        }
      } catch {}
    }
    return null;
  });

  const [isLiveGps, setIsLiveGps] = useState(false);
  const [locating, setLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [mapConfig, setMapConfig] = useState<{ center: LatLngExpression; zoom: number }>(() => ({
    center: userLocation ? userLocation : DEFAULT_CENTER,
    zoom: userLocation ? 14 : 11,
  }));

  const deepLinkHandled = useRef(false);

  /* ── Deep link (?post=:id) handler on initial load ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post");
    if (!postId) return;

    deepLinkHandled.current = true;

    // Check if post is already in loaded list
    const found = allBhandaras.find((p) => String(p.id) === String(postId));
    if (found) {
      setSelectedBhandara(found);
      setMapConfig({ center: [found.latitude, found.longitude], zoom: 15 });
    } else {
      // Fetch single post directly
      apiFetch(`/api/posts/${postId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 200 && data.data) {
            setSelectedBhandara(data.data);
            setMapConfig({ center: [data.data.latitude, data.data.longitude], zoom: 15 });
          }
        })
        .catch(() => {});
    }
  }, [allBhandaras]);

  /* ── Phone hardware / browser back button navigation (popstate) ── */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get("post");
      if (postId) {
        const found = allBhandaras.find((b) => String(b.id) === String(postId));
        if (found) {
          setSelectedBhandara(found);
          setMapConfig({ center: [found.latitude, found.longitude], zoom: 15 });
          return;
        }
      }
      // Back button pressed to base URL -> return smoothly to list
      setSelectedBhandara(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [allBhandaras]);

  /* ── Notifications & Live Proximity Dispatch ── */
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Sync preference to server whenever location or auth state updates
  const syncNotificationPreference = useCallback(async (coords: [number, number]) => {
    try {
      await apiFetch("/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({
          latitude: coords[0],
          longitude: coords[1],
          radiusKm: 10,
        }),
      });
    } catch (err) {
      console.warn("Could not sync notification preference", err);
    }
  }, []);

  // Display native OS notification (via ServiceWorker in background, or window Notification)
  const showNativeNotification = useCallback(async (title: string, body: string, url: string) => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && "showNotification" in reg) {
          await reg.showNotification(title, {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            data: { url },
          });
          return;
        }
      }
    } catch {}

    try {
      const notif = new Notification(title, {
        body,
        icon: "/favicon.ico",
        data: { url },
      });
      notif.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    } catch {}
  }, []);

  useEffect(() => {
    // Register Service Worker for background & offline notifications
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      const isGranted = Notification.permission === "granted";
      setNotificationsEnabled(isGranted);
      if (isGranted && userLocation) {
        syncNotificationPreference(userLocation);
      }
    }

    // SSE listener for nearby food distribution broadcasts & transitions using dynamic getApiBaseUrl()
    const apiUrl = getApiBaseUrl();
    const es = new EventSource(`${apiUrl}/api/events/stream`);

    es.addEventListener("notification:nearby", (e) => {
      try {
        const payload = JSON.parse(e.data);
        const title = `Nearby Food Alert: ${payload.title} 🛕`;
        const body = `${payload.address || "Community meal"} is starting ~${payload.distanceMeters || 100}m away!`;
        const postUrl = `/?post=${payload.postId}`;

        showNativeNotification(title, body, postUrl);
        toast({ title, description: body });
      } catch {}
    });

    es.addEventListener("post:updated", (e) => {
      try {
        const updated = JSON.parse(e.data);
        // If an upcoming post transitioned to LIVE and user requested reminder
        if (updated && updated.isLive && isReminderSet(updated.id)) {
          const title = `Bhandara Started: ${updated.title} 🍛`;
          const body = `${updated.address || "Serving now"} is live! Tap to view details.`;
          showNativeNotification(title, body, `/?post=${updated.id}`);
          toast({ title, description: body });
        }
      } catch {}
    });

    return () => es.close();
  }, [userLocation, syncNotificationPreference, showNativeNotification]);

  const handleToggleNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser does not support web notifications.",
        variant: "destructive",
      });
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      if (userLocation) {
        await syncNotificationPreference(userLocation);
      }
      toast({
        title: "Alerts Active",
        description: "You'll receive real notifications when free meals start within 10km.",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
      if (userLocation) {
        await syncNotificationPreference(userLocation);
      }
      toast({
        title: "Notifications Enabled!",
        description: "You will receive real alerts when free meals or upcoming bhandaras start in your area.",
      });
    } else {
      setNotificationsEnabled(false);
      toast({
        title: "Notifications Blocked",
        description: "Please allow notifications in your browser settings to receive alerts.",
        variant: "destructive",
      });
    }
  };

  /* ── Cleanup GPS watch on unmount ── */
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /* ── Accurate GPS + Transparent Diagnostics & Re-Prompt ── */
  const handleLocateMe = useCallback(
    (isInitialCheck = false) => {
      setLocating(true);

      const onPos = (pos: GeolocationPosition, isSilentUpdate = false) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setIsLiveGps(true);
        setLocating(false);
        setLocationModalOpen(false);
        setIsPickingOnMap(false);
        try {
          localStorage.setItem(
            LAST_LOCATION_KEY,
            JSON.stringify({ coords: loc, source: "gps", timestamp: Date.now() })
          );
        } catch {}

        if (!isSilentUpdate) {
          setMapConfig({ center: loc, zoom: 15 });
          toast({
            title: "📍 Live GPS Located",
            description: `Map centered (${loc[0].toFixed(4)}, ${loc[1].toFixed(4)}). Live tracking active.`,
          });

          if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
              (livePos) => onPos(livePos, true),
              () => {},
              { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
            );
          }
        }
      };

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocating(false);
        setLocationErrorType("unsupported");
        setLocationModalOpen(true);
        return;
      }

      const onError = (err: GeolocationPositionError) => {
        setLocating(false);
        const isInsecureLan =
          typeof window !== "undefined" &&
          !window.isSecureContext &&
          window.location.hostname !== "localhost" &&
          window.location.hostname !== "127.0.0.1";

        if (isInsecureLan) {
          setLocationErrorType("insecure_lan");
        } else if (err.code === err.PERMISSION_DENIED) {
          setLocationErrorType("permission_denied");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationErrorType("position_unavailable");
        } else if (err.code === err.TIMEOUT) {
          setLocationErrorType("timeout");
        } else {
          setLocationErrorType("permission_denied");
        }

        // Open modal to show diagnostics and provide instant city picker or map picker
        setLocationModalOpen(true);
      };

      // Always attempt to get actual physical GPS coordinates first
      navigator.geolocation.getCurrentPosition(
        (pos) => onPos(pos, false),
        (err) => {
          // If high-accuracy timed out, retry once with cellular/Wi-Fi triangulation
          if (err.code === err.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              (pos) => onPos(pos, false),
              () => onError(err),
              { maximumAge: 60000, timeout: 8000, enableHighAccuracy: false }
            );
          } else {
            onError(err);
          }
        },
        { maximumAge: 0, timeout: 12000, enableHighAccuracy: true }
      );
    },
    []
  );

  /* ── Proactively attempt to acquire real GPS location on site entry ── */
  useEffect(() => {
    handleLocateMe(true);
  }, [handleLocateMe]);

  /* ── Fast City / Holy Dham Selection ── */
  const handleSelectCity = useCallback((coords: [number, number], cityName: string) => {
    setUserLocation(coords);
    setIsLiveGps(false);
    setMapConfig({ center: coords, zoom: 14 });
    setLocationModalOpen(false);
    setIsPickingOnMap(false);
    try {
      localStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify({ coords, source: "city", name: cityName, timestamp: Date.now() })
      );
    } catch {}
    toast({
      title: `📍 Location Set: ${cityName}`,
      description: `Map centered on ${cityName}. Showing nearby free meals.`,
    });
  }, []);

  /* ── Map Click to set location manually anywhere on the map ── */
  const handleMapClick = useCallback((coords: [number, number]) => {
    setUserLocation(coords);
    setIsLiveGps(false);
    setMapConfig({ center: coords, zoom: 15 });
    setIsPickingOnMap(false);
    setLocationModalOpen(false);
    try {
      localStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify({ coords, source: "map", timestamp: Date.now() })
      );
    } catch {}
    toast({
      title: "📍 Custom Location Pinned",
      description: `Coordinates pinned (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}).`,
    });
  }, []);

  /* ── Filtered + sorted list ── */
  const filteredBhandaras = useMemo(() => {
    let list = allBhandaras;

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.description || b.content || "").toLowerCase().includes(q) ||
          (b.menu || "").toLowerCase().includes(q) ||
          (b.address || "").toLowerCase().includes(q)
      );
    }

    // Status filter: Live, Upcoming, Ended
    if (filters.status.length > 0) {
      list = list.filter((b) =>
        filters.status.some((s) => {
          const statusLower = b.status?.toLowerCase();
          if (s === "live") return b.isLive || statusLower === "live";
          if (s === "upcoming") return b.isUpcoming || statusLower === "upcoming";
          if (s === "ended") return statusLower === "ended";
          return false;
        })
      );
    }

    // Category filter
    if (filters.category.length > 0) {
      list = list.filter((b) => {
        const cat = b.category ? b.category.toLowerCase() : "other";
        return filters.category.map((c) => c.toLowerCase()).includes(cat);
      });
    }

    // Verified only
    if (filters.verifiedOnly) {
      list = list.filter((b) => b.organizer?.isVerified);
    }

    // Has image
    if (filters.hasImage) {
      list = list.filter((b) => !!b.imageUrl);
    }

    // Sort
    if (sortBy === "newest") {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "rating") {
      list = [...list].sort((a, b) => b.ratingAverage - a.ratingAverage);
    } else if (sortBy === "views") {
      list = [...list].sort((a, b) => b.watchCount - a.watchCount);
    } else if (sortBy === "nearest" && userLocation) {
      list = [...list].sort((a, b) => {
        const distA = Math.hypot(a.latitude - userLocation[0], a.longitude - userLocation[1]);
        const distB = Math.hypot(b.latitude - userLocation[0], b.longitude - userLocation[1]);
        return distA - distB;
      });
    }

    return list;
  }, [allBhandaras, searchTerm, filters, sortBy, userLocation]);

  /* ── Handlers with browser history sync for hardware back button ── */
  const handleMarkerClick = useCallback((b: Bhandara) => {
    setSelectedBhandara(b);
    setMapConfig({ center: [b.latitude, b.longitude], zoom: 15 });
    if (typeof window !== "undefined") {
      window.history.pushState({ postId: b.id }, "", `/?post=${b.id}`);
    }
  }, []);

  const handleFeedSelect = useCallback((b: Bhandara) => {
    setSelectedBhandara(b);
    setMapConfig({ center: [b.latitude, b.longitude], zoom: 15 });
    if (typeof window !== "undefined") {
      window.history.pushState({ postId: b.id }, "", `/?post=${b.id}`);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedBhandara(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("post")) {
        window.history.pushState({}, "", window.location.pathname);
      }
    }
  }, []);

  return (
    /* Full-viewport container — map as the base layer */
    <div className="relative h-dvh w-full overflow-hidden">

      {/* ── MAP (base layer, fills entire screen) ── */}
      <div className="absolute inset-0 z-0">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading bhandaras…</span>
          </div>
        ) : (
          <LeafletMap
            center={mapConfig.center}
            zoom={mapConfig.zoom}
            bhandaras={filteredBhandaras}
            userLocation={userLocation}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={setHoveredId}
            hoveredId={hoveredId}
            selectedId={selectedBhandara?.id ?? null}
            onMapClick={isPickingOnMap ? handleMapClick : undefined}
          />
        )}
      </div>

      {/* ── INTERACTIVE PINNING ON MAP BANNER ── */}
      {isPickingOnMap && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1100] bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce border border-primary-foreground/30">
          <MapPin className="w-4 h-4" />
          <span>Tap anywhere on the map to set your location</span>
          <button
            onClick={() => setIsPickingOnMap(false)}
            className="p-1 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── SERVER OFFLINE WARNING BANNER (Only when server unreachable) ── */}
      {error && (
        <div className="fixed top-0 inset-x-0 z-[1200] bg-red-600 text-white px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <AlertOctagon className="w-4 h-4 shrink-0 animate-pulse" />
          <span>🔴 Server Offline: Unable to reach Bhandara Setu server.</span>
        </div>
      )}

      {/* ── TOP-LEFT REVOLVING BRAND BADGE ── */}
      <div
        className={cn(
          "fixed left-3 sm:left-4 z-[950] flex items-center transition-all",
          error ? "top-10 sm:top-11" : "top-3 sm:top-4"
        )}
      >
        <div className="glass px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl shadow-md border border-border/60 backdrop-blur-md">
          <RevolvingTitle size="sm" showSubtitle={true} />
        </div>
      </div>

      {/* ── FLOATING SEARCH BAR (Quick search right on top of map) ── */}
      <div
        className={cn(
          "fixed z-[950] transition-all",
          error ? "top-20 sm:top-11" : "top-16 sm:top-4",
          "left-3 right-3 sm:left-64 sm:right-auto sm:w-80"
        )}
      >
        <div className="glass flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-lg border border-border/60 backdrop-blur-md">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search food, mandir, langar..."
            className="bg-transparent text-xs w-full outline-none placeholder:text-muted-foreground/70 text-foreground"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-muted-foreground hover:text-foreground p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── LOCATION ALERT / MAP PINNING STATUS BANNER ── */}
      {!userLocation && !isPickingOnMap && (
        <div
          className={cn(
            "fixed z-[945] transition-all",
            "top-28 sm:top-16 left-3 right-3 sm:left-64 sm:w-auto md:right-[430px]"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 backdrop-blur-md shadow-lg text-amber-900 dark:text-amber-200 text-xs font-medium animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
              <span className="truncate">
                Location required to discover free meals near you.
              </span>
            </div>
            <button
              onClick={() => handleLocateMe(false)}
              className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-bold text-[11px] shrink-0 hover:bg-primary/90 transition-transform active:scale-95 shadow-xs"
            >
              Set Location
            </button>
          </div>
        </div>
      )}

      {isPickingOnMap && (
        <div
          className={cn(
            "fixed z-[945] transition-all",
            "top-28 sm:top-16 left-3 right-3 sm:left-64 sm:w-auto md:right-[430px]"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-primary/20 border border-primary/50 backdrop-blur-md shadow-lg text-foreground text-xs font-semibold animate-pulse">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>Tap anywhere on the map to pin your location</span>
            </div>
            <button
              onClick={() => setIsPickingOnMap(false)}
              className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-[11px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TOP-RIGHT FLOATING ACTION CLUSTER (Theme, Notifications & Profile) ── */}
      <div
        className={cn(
          "fixed right-3 sm:right-4 md:right-[430px] z-[950] flex items-center gap-2 transition-all",
          error ? "top-10 sm:top-11" : "top-3 sm:top-4"
        )}
      >
        {/* Notification Alert Bell */}
        <button
          onClick={handleToggleNotifications}
          className={cn(
            "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl glass text-xs font-semibold shadow-sm transition-all hover:scale-105",
            notificationsEnabled
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={notificationsEnabled ? "Notifications active" : "Enable upcoming event alerts"}
        >
          {notificationsEnabled ? (
            <>
              <BellRing className="w-4 h-4 text-primary animate-bounce" />
              <span className="hidden sm:inline">Alerts On</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </>
          )}
        </button>

        {/* Theme Converter (Dark / Light Mode) */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl glass text-xs font-semibold shadow-sm transition-all hover:scale-105 hover:text-primary"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        {/* User Profile / Login */}
        {user && !user.isAnonymous ? (
          <Link
            href="/profile"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl glass shadow-sm hover:bg-primary/10 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="text-xs font-semibold max-w-[90px] truncate">
              {user.name ?? "Profile"}
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs font-semibold shadow-sm hover:text-primary transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}
      </div>

      {/* ── FLOATING GPS LOCATOR & CREATE POST FAB ── */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-[430px] z-[950] flex flex-col items-end gap-3 pointer-events-auto">
        {/* Floating GPS Locator Button */}
        <button
          onClick={() => handleLocateMe(false)}
          disabled={locating}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full glass-strong shadow-xl hover:scale-110 active:scale-95 transition-all bg-card/95 border",
            !userLocation
              ? "border-amber-500 ring-2 ring-amber-500/40 animate-pulse text-amber-600 dark:text-amber-400"
              : isLiveGps
              ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
              : "border-primary/30 text-primary"
          )}
          title={
            !userLocation
              ? "Location required — Tap to locate"
              : isLiveGps
              ? "Live GPS tracking active (tap to re-center)"
              : "Tap to center on your physical GPS location"
          }
        >
          {locating ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <LocateFixed className="w-5 h-5" />
          )}
        </button>

        {/* Floating Primary FAB — Share a Free Meal */}
        <Link
          href="/submit"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-2xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all border border-primary-foreground/20"
          title="Share a free meal listing"
        >
          <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>Share Meal</span>
        </Link>
      </div>

      {/* ── FEED PANEL (Desktop sidebar & Mobile 3-snap shutter with inline filters) ── */}
      <FeedPanel
        bhandaras={filteredBhandaras}
        selectedId={selectedBhandara?.id ?? null}
        hoveredId={hoveredId}
        onSelect={handleFeedSelect}
        onHover={setHoveredId}
        userLocation={userLocation}
        filters={filters}
        onFiltersChange={setFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* ── POST DETAIL PANEL (Drawer on desktop, bottom-sheet on mobile with Back button) ── */}
      <PostDetail
        bhandara={selectedBhandara}
        open={!!selectedBhandara}
        onClose={handleCloseDetail}
        onPostUpdated={(updated) => {
          updatePost(updated);
          setSelectedBhandara(updated);
        }}
      />

      {/* ── LOCATION PERMISSION & DIAGNOSTIC MODAL ── */}
      <LocationPermissionModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        errorType={locationErrorType}
        onRetry={() => handleLocateMe(false)}
        onPickOnMap={() => {
          setIsPickingOnMap(true);
          toast({
            title: "📍 Tap anywhere on the map",
            description: "Tap any road or mandir on the map to pin your location.",
          });
        }}
        onSelectCity={handleSelectCity}
        onUseSavedLocation={() => {
          try {
            const raw = localStorage.getItem(LAST_LOCATION_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              const coords = Array.isArray(parsed) ? parsed : parsed.coords;
              if (coords && coords.length === 2) {
                setUserLocation(coords as [number, number]);
                setMapConfig({ center: coords as [number, number], zoom: 14 });
                toast({
                  title: "📍 Saved Location Restored",
                  description: "Map centered on your previously saved location.",
                });
              }
            }
          } catch {}
        }}
        hasSavedLocation={Boolean(
          typeof window !== "undefined" && localStorage.getItem(LAST_LOCATION_KEY)
        )}
        hasCurrentLocation={Boolean(userLocation)}
        locating={locating}
      />
    </div>
  );
}
