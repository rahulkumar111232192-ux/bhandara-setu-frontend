/**
 * Notification management module for Bhandara Setu
 * - Independent Nearby Alerts Preference (bhandara_nearby_alerts_enabled)
 * - Notification Deduplication & Sent History (bhandara_sent_notifications)
 * - GPS Distance Calculation & Formatting
 * - Dynamic Time Remaining & Live Status Formatting
 */

const NEARBY_ALERTS_KEY = "bhandara_nearby_alerts_enabled";
const SENT_NOTIFICATIONS_KEY = "bhandara_sent_notifications";
const VISITOR_TOKEN_KEY = "bhandara_visitor_token";

// 24 hours TTL for deduplication cache
const DEDUPLICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function getVisitorToken(): string {
  if (typeof window === "undefined") return "server_token";
  try {
    let token = localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
      token = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return "fallback_token";
  }
}

/**
 * Checks if the user has explicitly enabled Nearby Bhandara Alerts.
 * Returns false by default until the user explicitly toggles it ON.
 */
export function getNearbyAlertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pref = localStorage.getItem(NEARBY_ALERTS_KEY);
    if (pref !== "true") return false;
    // Also verify browser notification permission is granted
    if ("Notification" in window && Notification.permission !== "granted") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Explicitly enable or disable Nearby Alerts.
 * Dispatches an event so all UI components (e.g. top-bar bell) update immediately.
 */
export function setNearbyAlertsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NEARBY_ALERTS_KEY, enabled ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("bhandara-alerts-changed", { detail: { enabled } })
    );
  } catch {}
}

/**
 * Returns the map of sent notifications: { `${type}:${postId}`: timestamp }
 * Automatically prunes entries older than 24 hours.
 */
function getSentRegistry(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const now = Date.now();
    const fresh: Record<string, number> = {};
    let pruned = false;

    for (const [key, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && now - ts < DEDUPLICATION_TTL_MS) {
        fresh[key] = ts;
      } else {
        pruned = true;
      }
    }

    if (pruned) {
      localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return {};
  }
}

/**
 * Checks whether a notification for this post & type has already been sent
 * to prevent annoying duplicate notifications.
 */
export function hasNotificationBeenSent(
  postId: number,
  type: "nearby" | "reminder"
): boolean {
  const registry = getSentRegistry();
  const key = `${type}:${postId}`;
  return Boolean(registry[key]);
}

/**
 * Records that a notification was sent for this post & type.
 */
export function markNotificationSent(
  postId: number,
  type: "nearby" | "reminder"
): void {
  if (typeof window === "undefined") return;
  try {
    const registry = getSentRegistry();
    const key = `${type}:${postId}`;
    registry[key] = Date.now();
    localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(registry));
  } catch {}
}

/**
 * Calculate Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format meters into human-readable distance (e.g. "350m away" or "2.4 km away").
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return "";
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km away`;
}

/**
 * Format time remaining or start time into a clear readable string.
 */
export function formatTimeRemaining(startTime: string | Date | null | undefined): string {
  if (!startTime) return "Upcoming";
  try {
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return "Upcoming";

    const diffMs = start - Date.now();
    const diffMins = Math.round(diffMs / (60 * 1000));

    if (diffMins <= 0) {
      return "Starting now";
    }
    if (diffMins < 60) {
      return `Starts in ${diffMins} min${diffMins > 1 ? "s" : ""}`;
    }
    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${hours}h`;
    }

    const startDate = new Date(startTime);
    return `Starts ${startDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })} at ${startDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return "Upcoming";
  }
}
