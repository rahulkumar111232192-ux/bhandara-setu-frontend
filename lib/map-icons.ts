import L from "leaflet";

/* ================================================================
   MARKER ICON FACTORY — 3 states: default | hovered | selected
   Clean, modern design without distracting breathing circles.
   ================================================================ */

type MarkerState = "default" | "hovered" | "selected";

const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

const MARKER_COLORS: Record<MarkerState, { ring: string; glow: string }> = {
  default:  { ring: "#ffffff",            glow: "rgba(0,0,0,0.2)" },
  hovered:  { ring: "#ffffff",            glow: "rgba(0,0,0,0.35)" },
  selected: { ring: "#ffffff",            glow: "rgba(0,0,0,0.4)" },
};

function buildMarkerSvg(
  state: MarkerState,
  accentColor?: string
): string {
  const { ring } = MARKER_COLORS[state];
  const size = state === "default" ? 32 : state === "hovered" ? 38 : 42;
  const bowlColor = accentColor || "hsl(25,90%,48%)";
  const isSelected = state === "selected";
  const isHovered = state === "hovered";

  // Crisp, clean elevation shadow without any breathing/pulsing animation
  const dropShadow = isSelected
    ? `drop-shadow(0 8px 16px rgba(0,0,0,0.35)) drop-shadow(0 0 6px ${bowlColor}90)`
    : isHovered
    ? `drop-shadow(0 4px 10px rgba(0,0,0,0.25))`
    : `drop-shadow(0 2px 6px rgba(0,0,0,0.18))`;

  // Subtle clean indicator ring on selected state (static, elegant, zero jitter)
  const selectedRing = isSelected
    ? `
      <div style="
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 2px solid ${bowlColor};
        background: ${bowlColor}15;
        pointer-events: none;
      "></div>
    `
    : "";

  return `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      filter: ${dropShadow};
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${selectedRing}
      <svg viewBox="0 0 28 28" width="${size}" height="${size}" style="position:relative;z-index:2;">
        <defs>
          <linearGradient id="grad-${state}-${bowlColor.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bowlColor}" stop-opacity="1" />
            <stop offset="100%" stop-color="${bowlColor}" stop-opacity="0.8" />
          </linearGradient>
        </defs>
        <!-- Steam -->
        <path d="M9 4 C9 2,10 1,11 2 C12 3,11 5,12 6" fill="none" stroke="${bowlColor}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
        <path d="M14 3 C14 1,15 0,16 1 C17 2,16 4,17 5" fill="none" stroke="${bowlColor}" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>
        <path d="M19 4 C19 2,20 1,21 2 C22 3,21 5,22 6" fill="none" stroke="${bowlColor}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>
        <!-- Bowl -->
        <path d="M5 10 C5 7,7 6,14 6 C21 6,23 7,23 10 C23 16,21 22,14 22 C7 22,5 16,5 10 Z"
              fill="url(#grad-${state}-${bowlColor.replace(/[^a-zA-Z0-9]/g, '')})" stroke="${ring}" stroke-width="${isSelected ? 2.5 : isHovered ? 2.2 : 1.8}" />
        <!-- Rim -->
        <ellipse cx="14" cy="10" rx="9" ry="2.5" fill="#ffffff" opacity="0.3" />
        <!-- Handles -->
        <path d="M3 11 C1 11,1 15,4 16" fill="none" stroke="${ring}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M25 11 C27 11,27 15,24 16" fill="none" stroke="${ring}" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </div>
  `;
}

export function createBhandaraIcon(
  state: MarkerState = "default",
  accentColor?: string,
  isLive: boolean = true
) {
  const size = state === "default" ? 32 : state === "hovered" ? 38 : 42;
  const opacity = isLive ? 1 : 0.45;
  const filter = isLive ? "" : "grayscale(80%)";
  return L.divIcon({
    html: `<div style="opacity:${opacity};filter:${filter};transition:opacity 0.2s, filter 0.2s;">${buildMarkerSvg(state, accentColor)}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

/* ── User location marker ── */
export function createUserLocationIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:0;
          background:hsl(210,100%,56%);
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 0 4px rgba(66,133,244,0.3), 0 2px 8px rgba(0,0,0,0.2);
        "></div>
      </div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

/* ── Map tile layers (FREE - OpenStreetMap based, no API key required) ── */
export const lightTileLayer = {
   url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};
export const darkTileLayer = {
  url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20,
};

export const mapTileLayer = lightTileLayer;
