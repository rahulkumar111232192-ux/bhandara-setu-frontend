import { useEffect, useRef, useState, useCallback } from "react";
import type { Bhandara } from "@/lib/types";
import { apiFetch, getApiBaseUrl } from "@/lib/api";

type PostEvent = { id: number } & Partial<Bhandara>;

interface UseLivePostsReturn {
  posts: Bhandara[];
  loading: boolean;
  error: string | null;
  /** Manually replace / update a single post in state (e.g. after a local vote) */
  updatePost: (post: Bhandara) => void;
  /** Manually add a newly created post to state */
  addPost: (post: Bhandara) => void;
}

const RECONNECT_DELAY_MS = 3000;

/**
 * useLivePosts
 *
 * Fetches the initial list of LIVE posts then opens a Server-Sent Events
 * connection to /api/events/stream. Incoming events are merged into local state:
 *
 *   - post:updated  → replaces or inserts the post in the list
 *   - post:expired  → removes the post from the list (it is no longer LIVE)
 *
 * The hook also returns helper functions so callers can apply optimistic updates.
 */
const POSTS_CACHE_KEY = "bhandara_posts_cache";

export function useLivePosts(view: string = "all"): UseLivePostsReturn {
  const [posts, setPosts] = useState<Bhandara[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`${POSTS_CACHE_KEY}_${view}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [loading, setLoading] = useState(() => posts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial & background fetch ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (posts.length === 0) setLoading(true);

        const res = await apiFetch(`/api/posts?view=${view}`);
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled && data.status === 200 && Array.isArray(data.data)) {
          setPosts(data.data);
          setError(null);
          try {
            localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(data.data));
          } catch {}
        }
      } catch (err: any) {
        console.warn("Could not load posts from server:", err?.message);
        if (!cancelled) {
          setError("Server is offline or unreachable. Listings cannot be loaded or updated.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [view]);

  // ── SSE connection ──────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const sseUrl = `${getApiBaseUrl()}/api/events/stream`;
    const es = new EventSource(sseUrl);
    esRef.current = es;

    es.addEventListener("post:updated", (e) => {
      const updated: Bhandara = JSON.parse(e.data);
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === updated.id);
        let next: Bhandara[];
        if (idx === -1) {
          next = [updated, ...prev];
        } else {
          next = [...prev];
          next[idx] = { ...next[idx], ...updated };
        }
        try {
          localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    });

    es.addEventListener("post:expired", (e) => {
      const { id }: { id: number } = JSON.parse(e.data);
      setPosts((prev) => {
        const next = view === "live" ? prev.filter((p) => p.id !== id) : prev.map((p) => p.id === id ? { ...p, isLive: false, status: "ended" } : p);
        try {
          localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [view]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const updatePost = useCallback((post: Bhandara) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...post };
      try {
        localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [view]);

  const addPost = useCallback((post: Bhandara) => {
    setPosts((prev) => {
      const next = [post, ...prev];
      try {
        localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [view]);

  return { posts, loading, error, updatePost, addPost };
}

