import { useEffect, useState, useCallback } from "react";
import type { Bhandara } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useServerEvent } from "@/hooks/use-server-event";

interface UseLivePostsReturn {
  posts: Bhandara[];
  loading: boolean;
  error: string | null;
  /** Manually replace / update a single post in state (e.g. after a local vote) */
  updatePost: (post: Bhandara) => void;
  /** Manually add a newly created post to state */
  addPost: (post: Bhandara) => void;
}

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

  const handlePostUpdated = useCallback((event: MessageEvent<string>) => {
    const updated: Bhandara = JSON.parse(event.data);
    setPosts((prev) => {
      const idx = prev.findIndex((post) => post.id === updated.id);
      if (idx === -1 && view === "live" && !updated.isLive) return prev;
      const next = idx === -1
        ? [updated, ...prev]
        : prev.map((post, index) => index === idx ? { ...post, ...updated } : post);
      try {
        localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [view]);

  const handlePostExpired = useCallback((event: MessageEvent<string>) => {
    const { id }: { id: number } = JSON.parse(event.data);
    setPosts((prev) => {
      const next = view === "live"
        ? prev.filter((post) => post.id !== id)
        : prev.map((post) => post.id === id ? { ...post, isLive: false, status: "ended" } : post);
      try {
        localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [view]);

  const handleCommentAdded = useCallback((event: MessageEvent<string>) => {
    const comment: { postId: number } = JSON.parse(event.data);
    setPosts((prev) => {
      const next = prev.map((post) => post.id === comment.postId
        ? { ...post, commentCount: (post.commentCount ?? 0) + 1 }
        : post);
      try {
        localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [view]);

  const handleCommentDeleted = useCallback((event: MessageEvent<string>) => {
    const { postId }: { postId: number; commentId: number } = JSON.parse(event.data);
    setPosts((prev) => {
      const next = prev.map((post) => post.id === postId
        ? { ...post, commentCount: Math.max(0, (post.commentCount ?? 0) - 1) }
        : post);
      try {
        localStorage.setItem(`${POSTS_CACHE_KEY}_${view}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [view]);

  useServerEvent("post:updated", handlePostUpdated);
  useServerEvent("post:expired", handlePostExpired);
  useServerEvent("comment:new", handleCommentAdded);
  useServerEvent("comment:deleted", handleCommentDeleted);

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
