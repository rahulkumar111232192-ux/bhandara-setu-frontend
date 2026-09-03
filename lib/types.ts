/* ── Post categories ── */
export type PostCategory =
  | "temple"
  | "community"
  | "ngo"
  | "corporate"
  | "personal"
  | "other";

export interface CategoryConfig {
  label: string;
  color: string;      // Tailwind-friendly hex for marker
  darkColor: string;
  icon: string;        // emoji shorthand
}

export const CATEGORY_MAP: Record<PostCategory, CategoryConfig> = {
  temple:    { label: "Temple",     color: "#e67e22", darkColor: "#f39c12", icon: "🛕" },
  community: { label: "Community", color: "#27ae60", darkColor: "#2ecc71", icon: "🤝" },
  ngo:       { label: "NGO",       color: "#2980b9", darkColor: "#3498db", icon: "💚" },
  corporate: { label: "Corporate", color: "#8e44ad", darkColor: "#9b59b6", icon: "🏢" },
  personal:  { label: "Personal",  color: "#e74c3c", darkColor: "#e74c3c", icon: "🙏" },
  other:     { label: "Other",     color: "#95a5a6", darkColor: "#bdc3c7", icon: "📍" },
};

/* ── Domain types ── */
export interface Organizer {
  id: number;
  name: string;
  bio: string | null;
  profileImage: string | null;
  isVerified: boolean;
}

export interface Bhandara {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  menu: string | null;
  role: string | null;
  duration?: string;
  status: string;
  category?: PostCategory;
  startTime: string | null;
  endTime: string | null;
  expectedStartTime: string | null;
  expiresAt?: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  isLive: boolean;
  isUpcoming?: boolean;
  isArchived: boolean;
  watchCount: number;
  ratingAverage: number;
  upvoteCount?: number;
  downvoteCount?: number;
  voteScore?: number;
  commentCount?: number;

  userId: number | null;
  organizerId: number | null;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  organizer: Organizer | null;
  created_at: string;
  updated_at: string;
}


export interface User {
  id: number | string;
  name: string | null;
  email?: string;
  isAnonymous?: boolean;
}

export interface AuthResponse {
  status: number;
  token?: string;
  user: User;
}

/* ── Filter/Sort types ── */
export type SortOption = "newest" | "nearest" | "rating" | "views";

export interface FilterState {
  status: ("live" | "ended" | "archived")[];
  category: PostCategory[];
  verifiedOnly: boolean;
  hasImage: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  status: [],
  category: [],
  verifiedOnly: false,
  hasImage: false,
};
