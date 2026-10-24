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
import { useServerEvent } from "@/hooks/use-server-event";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { isReminderSet, markReminderFired } from "@/lib/reminders";
import {
  getNearbyAlertsEnabled,
  setNearbyAlertsEnabled,
  hasNotificationBeenSent,
  markNotificationSent,
  calculateDistanceMeters,
  formatDistance,
  formatTimeRemaining,
  getVisitorToken,
} from "@/lib/notifications";

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileSnap, setMobileSnap] = useState<"min" | "half" | "max">("half");
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

  // Helper for web-push keys
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Sync preference to server whenever location or auth state updates
  const syncNotificationPreference = useCallback(async (coords: [number, number]) => {
    try {
      const token = getVisitorToken();
      let pushSubscription = null;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      // Try to get Push Subscription for offline background notifications
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          const reg = await navigator.serviceWorker.register(`${basePath}/sw.js`);
          pushSubscription = await reg.pushManager.getSubscription();
          if (!pushSubscription && vapidPublicKey) {
            pushSubscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
          }
        } catch (err) {
          console.warn("Could not register for background push notifications", err);
        }
      }

      const response = await apiFetch("/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({
          latitude: coords[0],
          longitude: coords[1],
          radiusKm: 10,
          token,
          pushSubscription: pushSubscription?.toJSON() || null,
        }),
      });
      if (!response.ok) {
        throw new Error(`Could not save notification preference (${response.status})`);
      }
      const result = await response.json();
      return { saved: true, pushEnabled: Boolean(result.pushEnabled) };
    } catch (err) {
      console.warn("Could not sync notification preference", err);
      return { saved: false, pushEnabled: false };
    }
  }, []);

  // Unsubscribe from server-side alerts
  const unsubscribeNearbyAlerts = useCallback(async () => {
    try {
      const token = getVisitorToken();
      await apiFetch("/api/notifications/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.warn("Could not unsubscribe notifications", err);
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

  const handleNearbyNotification = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data);
      if (!payload?.postId || !getNearbyAlertsEnabled()) return;
      if (hasNotificationBeenSent(payload.postId, "nearby")) return;

      let formattedDist = "";
      if (userLocation && payload.latitude && payload.longitude) {
        const meters = calculateDistanceMeters(
          userLocation[0],
          userLocation[1],
          Number(payload.latitude),
          Number(payload.longitude)
        );
        if (meters > 10000) return;
        formattedDist = formatDistance(meters);
      }

      const isLive = payload.status === "live" || payload.isLive;
      const distText = formattedDist ? ` (~${formattedDist})` : "";
      const title = isLive
        ? `🔴 Live Food Alert: ${payload.title} 🛕`
        : `⏳ Upcoming Food Drive: ${payload.title}`;
      const body = isLive
        ? `Live Now${distText} • ${payload.address || "Community meal"} is serving food!`
        : `${formatTimeRemaining(payload.startTime)}${distText} • ${payload.address || "Community meal scheduled"}`;

      markNotificationSent(payload.postId, "nearby");
      showNativeNotification(title, body, `/?post=${payload.postId}`);
      toast({ title, description: body });
    } catch (error) {
      console.warn("notification:nearby error", error);
    }
  }, [userLocation, showNativeNotification]);

  const handlePostReminder = useCallback((event: MessageEvent<string>) => {
    try {
      const updated = JSON.parse(event.data);
      if (!updated?.id || !updated.isLive || !isReminderSet(updated.id)) return;
      if (hasNotificationBeenSent(updated.id, "reminder")) return;

      markReminderFired(updated.id);
      let distText = "";
      if (userLocation && updated.latitude && updated.longitude) {
        const meters = calculateDistanceMeters(
          userLocation[0],
          userLocation[1],
          Number(updated.latitude),
          Number(updated.longitude)
        );
        distText = ` (~${formatDistance(meters)})`;
      }

      const title = `🔔 Bhandara Started: ${updated.title} 🍛`;
      const body = `🔴 Live Now${distText} • ${updated.address || "Serving food now"}! Tap to view details.`;
      showNativeNotification(title, body, `/?post=${updated.id}`);
      toast({ title, description: body });
    } catch (error) {
      console.warn("post:updated reminder error", error);
    }
  }, [userLocation, showNativeNotification]);

  useServerEvent("notification:nearby", handleNearbyNotification);
  useServerEvent("post:updated", handlePostReminder);

  useEffect(() => {
    // Register Service Worker for background & offline notifications
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker.register(`${basePath}/sw.js`).catch((err) => {
        console.warn("Could not register the notification service worker", err);
      });
    }

    // Only set enabled if user EXPLICITLY turned on nearby alerts AND browser granted permission
    const isNearbyActive = getNearbyAlertsEnabled();
    setNotificationsEnabled(isNearbyActive);

    if (isNearbyActive && userLocation) {
      syncNotificationPreference(userLocation);
    }

    const handleAlertsChanged = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail !== undefined) {
        setNotificationsEnabled(custom.detail.enabled);
      } else {
        setNotificationsEnabled(getNearbyAlertsEnabled());
      }
    };
    window.addEventListener("bhandara-alerts-changed", handleAlertsChanged);

    return () => {
      window.removeEventListener("bhandara-alerts-changed", handleAlertsChanged);
    };
  }, [userLocation, syncNotificationPreference]);

  const handleToggleNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser does not support web notifications.",
        variant: "destructive",
      });
      return;
    }

    // IF ALREADY ENABLED -> TOGGLE OFF!
    if (notificationsEnabled) {
      setNearbyAlertsEnabled(false);
      setNotificationsEnabled(false);
      await unsubscribeNearbyAlerts();
      toast({
        title: "🔕 Nearby Alerts Turned Off",
        description: "You will no longer receive nearby food drive notifications.",
      });
      return;
    }

    // Location is required to turn ON notifications
    if (!userLocation) {
      toast({
        title: "📍 Location Required",
        description: "Please set your location first so we can find meals near you.",
      });
      setLocationModalOpen(true);
      return;
    }

    // IF NOT ENABLED -> TOGGLE ON!
    if (Notification.permission === "granted") {
      setNearbyAlertsEnabled(true);
      setNotificationsEnabled(true);
      const syncResult = await syncNotificationPreference(userLocation);
      toast({
        title: "🔔 Nearby Alerts Turned ON",
        description: !syncResult.saved
          ? "Could not save your alert preferences. Please try again."
          : syncResult.pushEnabled
            ? "You'll receive nearby alerts, including background push notifications."
            : "Nearby alerts are saved, but background push is unavailable. Keep the app open for alerts.",
      });
      return;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Notifications Blocked",
        description: "Please allow notifications in your browser settings to receive alerts.",
        variant: "destructive",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNearbyAlertsEnabled(true);
      setNotificationsEnabled(true);
      if ("serviceWorker" in navigator) {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        navigator.serviceWorker.register(`${basePath}/sw.js`).catch((err) => {
          console.warn("Could not register the notification service worker", err);
        });
      }
      const syncResult = await syncNotificationPreference(userLocation);
      toast({
        title: "🔔 Nearby Alerts Enabled!",
        description: !syncResult.saved
          ? "Could not save your alert preferences. Please try again."
          : syncResult.pushEnabled
            ? "You'll receive nearby alerts, including background push notifications."
            : "Nearby alerts are saved, but background push is unavailable. Keep the app open for alerts.",
      });
    } else {
      setNearbyAlertsEnabled(false);
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
    // Removed automatic aggressive GPS location request on load (Bug 2)
    // App now waits for user to manually click the locate button.
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

      {/* ── COLLAPSIBLE MAP SEARCH ── */}
      <div
        className={cn(
          "fixed z-[1050] transition-all",
          error ? "top-20 sm:top-11" : "top-16 sm:top-4",
          "left-3 sm:left-64 md:left-[420px]"
        )}
      >
        {!isSearchOpen ? (
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl glass shadow-lg border border-border/60 backdrop-blur-md text-muted-foreground hover:text-foreground transition-colors"
            title="Search meals"
            aria-label="Open meal search"
          >
            <Search className="h-4 w-4" />
            {searchTerm && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
        ) : (
          <div className="glass flex w-[min(20rem,calc(100vw-1.5rem))] items-center gap-2 rounded-2xl border border-border/60 px-3.5 py-2 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-left-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsSearchOpen(false);
              }}
              placeholder="Search food, mandir, langar..."
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
              aria-label="Search meals"
            />
            <button
              type="button"
              onClick={() => {
                if (searchTerm) setSearchTerm("");
                else setIsSearchOpen(false);
              }}
              className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
              title={searchTerm ? "Clear search" : "Close search"}
              aria-label={searchTerm ? "Clear search" : "Close search"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── LOCATION ALERT / MAP PINNING STATUS BANNER ── */}
      {/* Removed mandatory location banner (Bug 2) to prevent irritating users.
          Location is now optional. */}

      {isPickingOnMap && (
        <div
          className={cn(
            "fixed z-[945] transition-all",
            "top-28 sm:top-16 left-3 right-3 sm:left-64 sm:w-auto md:left-[420px] md:right-4"
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
          "fixed right-3 sm:right-4 z-[950] flex items-center gap-2 transition-all",
          error ? "top-10 sm:top-11" : "top-3 sm:top-4"
        )}
      >
        {/* Notification Alert Bell */}
        <button
          onClick={handleToggleNotifications}
          className={cn(
            "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl glass text-xs font-semibold shadow-sm transition-all hover:scale-105 cursor-pointer",
            notificationsEnabled
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={notificationsEnabled ? "Nearby alerts are ON • Tap to turn OFF" : "Nearby alerts are OFF • Tap to turn ON"}
          aria-label={notificationsEnabled ? "Disable nearby alerts" : "Enable nearby alerts"}
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

      {/* ── FLOATING GPS LOCATOR & CREATE POST FAB (Mobile Only) ── */}
      <div
        className="md:hidden fixed right-4 z-[950] flex flex-col items-end gap-3 pointer-events-auto transition-[bottom] duration-300"
        style={{
          bottom:
            mobileSnap === "min"
              ? "calc(62px + 1rem)"
              : mobileSnap === "half"
                ? "calc(48vh + 1rem)"
                : "calc(min(72vh, 100dvh - 135px) + 1rem)",
        }}
      >
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
              : "border-amber-500 text-amber-600 dark:text-amber-400"
          )}
          title={
            !userLocation
              ? "Location required — Tap to locate"
              : isLiveGps
              ? "Live GPS tracking active (tap to re-center)"
              : "Showing pinned/saved location (tap to use Live GPS)"
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

      {/* Desktop map actions stay outside the feed panel. */}
      <div className="hidden md:flex fixed right-5 bottom-20 z-[1050] flex-col items-end gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={() => handleLocateMe(false)}
          disabled={locating}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full glass-strong bg-card/95 border shadow-xl transition-all hover:scale-110 active:scale-95",
            !userLocation
              ? "border-amber-500 ring-2 ring-amber-500/40 text-amber-600 dark:text-amber-400"
              : isLiveGps
                ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500 text-amber-600 dark:text-amber-400"
          )}
          title={isLiveGps ? "Live GPS active — recenter map" : "Use my current location"}
          aria-label="Use my current location"
        >
          {locating ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <LocateFixed className="h-5 w-5" />}
        </button>
        <Link
          href="/submit"
          className="flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-2xl transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
          title="Share a free meal listing"
        >
          <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
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
        mobileSnap={mobileSnap}
        onMobileSnapChange={setMobileSnap}
        sortBy={sortBy}
        onSortChange={setSortBy}
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
        userLocation={userLocation}
        onLocateMe={() => handleLocateMe(false)}
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
