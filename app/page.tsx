"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Bhandara, FilterState, SortOption } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import { Loader2, LocateFixed, Bell, BellRing, User, PlusCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { MapToolbar, MobileBottomBar } from "@/components/MapToolbar";
import FeedPanel from "@/components/FeedPanel";
import PostDetail from "@/components/PostDetail";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FilterDropdown } from "@/components/FilterDropdown";
import { SortDropdown } from "@/components/SortDropdown";
import { RevolvingTitle } from "@/components/RevolvingTitle";
import { useLivePosts } from "@/hooks/use-live-posts";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/10">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

const DEFAULT_CENTER: LatLngExpression = [28.6139, 77.209];
const LAST_LOCATION_KEY = "bhandara_last_location";

export default function Home() {
  /* ── Data — live via SSE ── */
  const { posts: allBhandaras, loading, updatePost } = useLivePosts();
  const { user } = useAuth();

  /* ── Selection / hover sync ── */
  const [selectedBhandara, setSelectedBhandara] = useState<Bhandara | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  /* ── Search / filter / sort ── */
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  /* ── Map state with cached location fallback ── */
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LAST_LOCATION_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const [locating, setLocating] = useState(false);
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
      fetch(`/api/posts/${postId}`)
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

    // SSE listener for nearby food distribution broadcasts
    const es = new EventSource("/api/events/stream");
    es.addEventListener("notification:nearby", (e) => {
      try {
        const payload = JSON.parse(e.data);
        const title = `Nearby Food Alert: ${payload.title} 🛕`;
        const body = `${payload.address || "Community meal"} is starting ~${payload.distanceMeters || 100}m away!`;
        const postUrl = `/?post=${payload.postId}`;

        showNativeNotification(title, body, postUrl);

        toast({
          title,
          description: body,
        });
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
        description: "Server is maintaining your location preference. You'll receive alerts for meals within 10km!",
      });
      triggerTestNotification();
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
        description: "Your preference is saved. You will receive alerts when free meals are shared in your area.",
      });
      triggerTestNotification();
    } else {
      setNotificationsEnabled(false);
      toast({
        title: "Notifications Blocked",
        description: "Please allow notifications in your browser settings to receive alerts.",
        variant: "destructive",
      });
    }
  };

  const triggerTestNotification = () => {
    const title = "Bhandara Alert 🛕";
    const body = "Shiv Mandir Community Langar is starting in 15 minutes near your location!";

    showNativeNotification(title, body, "/");

    toast({
      title: "Test Alert: " + title,
      description: body,
    });
  };

  /* ── Fast Locate Me (Cached + GPS + Low-Accuracy Fallback) ── */
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation unavailable",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setLocating(true);

    const onSuccess = (pos: GeolocationPosition) => {
      const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(loc);
      setMapConfig({ center: loc, zoom: 15 });
      setLocating(false);
      try {
        localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(loc));
      } catch {}
      toast({
        title: "Location found",
        description: `Map centered (${loc[0].toFixed(4)}, ${loc[1].toFixed(4)}).`,
      });
    };

    const onError = () => {
      // Fallback with low accuracy for instant cellular/WiFi triangulation
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
          setLocating(false);
          toast({
            title: "Location Access Required",
            description: "Please allow location access in your browser settings to locate yourself on the map.",
            variant: "destructive",
          });
        },
        { maximumAge: 60000, timeout: 6000, enableHighAccuracy: false }
      );
    };

    // Fast attempt with cached position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      maximumAge: 30000,
      timeout: 4000,
      enableHighAccuracy: true,
    });
  }, []);


  /* ── Filtered + sorted list ── */
  const filteredBhandaras = useMemo(() => {
    let list = allBhandaras;

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.description || b.content || "").toLowerCase().includes(q) ||
          (b.menu || "").toLowerCase().includes(q) ||
          (b.address || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      list = list.filter((b) =>
        filters.status.some((s) => {
          const statusLower = b.status?.toLowerCase();
          if (s === "live") return b.isLive || statusLower === "live";
          if (s === "ended") return statusLower === "ended";
          if (s === "archived") return b.isArchived || statusLower === "archived";
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

  /* ── Handlers ── */
  const handleMarkerClick = useCallback((b: Bhandara) => {
    setSelectedBhandara(b);
    setMapConfig({ center: [b.latitude, b.longitude], zoom: 15 });
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/?post=${b.id}`);
    }
  }, []);

  const handleFeedSelect = useCallback((b: Bhandara) => {
    setSelectedBhandara(b);
    setMapConfig({ center: [b.latitude, b.longitude], zoom: 15 });
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/?post=${b.id}`);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedBhandara(null);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
  }, []);

  const handleSearchToggle = useCallback(() => {
    setSearchVisible((v) => !v);
    setFilterVisible(false);
    setSortVisible(false);
  }, []);

  const handleFilterToggle = useCallback(() => {
    setFilterVisible((v) => !v);
    setSortVisible(false);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortVisible((v) => !v);
    setFilterVisible(false);
  }, []);

  return (
    /* Full-viewport container — map as the base layer */
    <div className="relative h-dvh w-full overflow-hidden">

      {/* ── MAP (base layer, fills everything) ── */}
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
          />
        )}
      </div>

      {/* ── TOP-LEFT REVOLVING BRAND BADGE (Cultural / Regional Connection) ── */}
      <div className="fixed top-3 sm:top-4 left-3 sm:left-4 z-[950] flex items-center">
        <div className="glass px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl shadow-md border border-border/60 backdrop-blur-md">
          <RevolvingTitle size="sm" showSubtitle={true} />
        </div>
      </div>

      {/* ── TOP-RIGHT ACTION BAR (Profile & Notifications) ── */}
      <div className="fixed top-4 right-4 md:right-[410px] z-[950] flex items-center gap-2">
        {/* Notification Bell */}
        <button
          onClick={handleToggleNotifications}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs font-semibold shadow-sm transition-all hover:scale-105",
            notificationsEnabled
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={notificationsEnabled ? "Notifications active (click to test alert)" : "Enable upcoming event notifications"}
        >
          {notificationsEnabled ? (
            <>
              <BellRing className="w-4 h-4 text-primary animate-bounce" />
              <span className="hidden sm:inline">Alerts On</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Enable Alerts</span>
            </>
          )}
        </button>

        {/* Create Post Button */}
        <Link
          href="/submit"
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md hover:bg-primary/90 transition-all hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Post</span>
        </Link>

        {/* User Profile / Login */}
        {user && !user.isAnonymous ? (
          <Link
            href="/profile"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl glass shadow-sm hover:bg-primary/10 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="text-xs font-semibold max-w-[90px] truncate">{user.name ?? "Profile"}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs font-semibold shadow-sm hover:text-primary transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        )}
      </div>

      {/* ── BOTTOM-RIGHT FLOATING GPS LOCATE BUTTON ── */}
      <button
        onClick={handleLocateMe}
        disabled={locating}
        className="fixed bottom-20 md:bottom-8 right-6 z-[950] flex items-center justify-center w-12 h-12 rounded-full glass-strong shadow-lg text-primary hover:scale-110 active:scale-95 transition-all bg-card/90 border border-primary/30"
        title="Locate me fast"
      >
        {locating ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : (
          <LocateFixed className="w-6 h-6" />
        )}
      </button>

      {/* ── LEFT TOOLBAR (desktop) ── */}
      <MapToolbar
        onSearchToggle={handleSearchToggle}
        onFilterToggle={handleFilterToggle}
        onSortToggle={handleSortToggle}
        onLocateMe={handleLocateMe}
        locating={locating}
      />

      {/* ── SEARCH OVERLAY ── */}
      <SearchOverlay
        visible={searchVisible}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClose={() => setSearchVisible(false)}
      />

      {/* ── FILTER DROPDOWN ── */}
      <FilterDropdown
        visible={filterVisible}
        filters={filters}
        onFiltersChange={setFilters}
        onClose={() => setFilterVisible(false)}
      />

      {/* ── SORT DROPDOWN ── */}
      <SortDropdown
        visible={sortVisible}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClose={() => setSortVisible(false)}
      />

      {/* ── RIGHT FEED PANEL ── */}
      <FeedPanel
        bhandaras={filteredBhandaras}
        selectedId={selectedBhandara?.id ?? null}
        hoveredId={hoveredId}
        onSelect={handleFeedSelect}
        onHover={setHoveredId}
        userLocation={userLocation}
      />

      {/* ── POST DETAIL PANEL ── */}
      <PostDetail
        bhandara={selectedBhandara}
        open={!!selectedBhandara}
        onClose={handleCloseDetail}
        onPostUpdated={(updated) => {
          updatePost(updated);
          setSelectedBhandara(updated);
        }}
      />

      {/* ── MOBILE BOTTOM BAR ── */}
      <MobileBottomBar
        onSearchToggle={handleSearchToggle}
        onFilterToggle={handleFilterToggle}
        onSortToggle={handleSortToggle}
        onLocateMe={handleLocateMe}
        locating={locating}
      />
    </div>
  );
}


