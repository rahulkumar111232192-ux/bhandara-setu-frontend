"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Clock, Pencil, Trash2, Archive, PlusCircle, LogOut,
  User, RefreshCw, MessageCircle, ThumbsUp, ThumbsDown, Award,
  CheckCircle, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useServerEvent } from "@/hooks/use-server-event";
import type { Bhandara } from "@/lib/types";
import CommentSection from "@/components/CommentSection";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  live: { label: "Live Now", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  upcoming: { label: "Upcoming", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ended: { label: "Ended", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  archived: { label: "Archived", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PostCard({
  post,
  onArchive,
  onDelete,
}: {
  post: Bhandara;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.ended;
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await apiFetch(`/api/posts/${post.id}/archive`, { method: "POST" });
      if (res.ok) onArchive(post.id);
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this listing permanently?")) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) onDelete(post.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col transition-all hover:border-border">
      {/* Image */}
      {post.imageUrl ? (
        <div className="h-36 relative overflow-hidden">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
          <span className={`absolute top-2 left-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      ) : (
        <div className="h-14 bg-muted/30 flex items-center px-4">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold line-clamp-1">{post.title}</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className="line-clamp-1">{post.address ?? `${post.latitude?.toFixed(4)}, ${post.longitude?.toFixed(4)}`}</span>
        </div>

        {/* Verification signals */}
        <div className="flex items-center gap-3 text-xs pt-1 border-t border-border/40">
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <ThumbsUp className="w-3.5 h-3.5" /> {post.upvoteCount ?? 0} Confirmed
          </span>
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <ThumbsDown className="w-3.5 h-3.5" /> {post.downvoteCount ?? 0} Reported
          </span>
          <span className="flex items-center gap-1 text-muted-foreground ml-auto">
            <Clock className="w-3.5 h-3.5" /> {formatDate(post.created_at as string)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-border/40 divide-x divide-border/40 bg-muted/10">
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-primary" />
          Comments {post.commentCount ? `(${post.commentCount})` : ""}
          {commentsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {post.status === "live" && (
          <Link
            href={`/submit?edit=${post.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
        )}
        {post.status === "live" && (
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" /> {archiving ? "…" : "End"}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-destructive/70 hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> {deleting ? "…" : "Delete"}
        </button>
      </div>

      {/* Inline Comments Drawer */}
      {commentsOpen && (
        <div className="p-4 border-t border-border/60 bg-card/60">
          <CommentSection
            postId={post.id}
            postOwnerId={post.userId}
          />
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isSessionVerified, logout, validateSession } = useAuth();
  const [posts, setPosts] = useState<Bhandara[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "live" | "upcoming" | "ended">("all");
  const [interactionStats, setInteractionStats] = useState({ confirmedCount: 0, reportedCount: 0 });

  const fetchMyPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      setError(null);
      const res = await apiFetch("/api/users/me/posts");
      if (res.status === 401) {
        setError("Your session expired. Please sign in again.");
        router.push("/login?redirect=/profile");
        return;
      }
      const data = await res.json();
      if (data.status === 200 && Array.isArray(data.data)) {
        setPosts(data.data);
        if (data.interactionStats) setInteractionStats(data.interactionStats);
      } else {
        setError(data.message || "Failed to load your posts.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not load your posts. Please try again.");
    } finally {
      setLoadingPosts(false);
    }
  }, [router]);

  const handlePostUpdated = useCallback((event: MessageEvent<string>) => {
    const updated: Bhandara = JSON.parse(event.data);
    if (String(updated.userId) !== String(user?.id)) return;
    setPosts((previous) => {
      const existingIndex = previous.findIndex((post) => post.id === updated.id);
      if (existingIndex < 0) return [updated, ...previous];
      return previous.map((post, index) => index === existingIndex ? { ...post, ...updated } : post);
    });
  }, [user?.id]);

  const handlePostExpired = useCallback((event: MessageEvent<string>) => {
    const { id }: { id: number } = JSON.parse(event.data);
    setPosts((previous) => previous.map((post) =>
      post.id === id ? { ...post, isLive: false, isUpcoming: false, status: "ended" } : post
    ));
  }, []);

  const handleCommentAdded = useCallback((event: MessageEvent<string>) => {
    const { postId }: { postId: number } = JSON.parse(event.data);
    setPosts((previous) => previous.map((post) =>
      post.id === postId ? { ...post, commentCount: (post.commentCount ?? 0) + 1 } : post
    ));
  }, []);

  const handleCommentDeleted = useCallback((event: MessageEvent<string>) => {
    const { postId }: { postId: number } = JSON.parse(event.data);
    setPosts((previous) => previous.map((post) =>
      post.id === postId ? { ...post, commentCount: Math.max(0, (post.commentCount ?? 0) - 1) } : post
    ));
  }, []);

  useServerEvent("post:updated", handlePostUpdated);
  useServerEvent("post:expired", handlePostExpired);
  useServerEvent("comment:new", handleCommentAdded);
  useServerEvent("comment:deleted", handleCommentDeleted);

  useEffect(() => {
    if (!isLoading) {
      if (user && !user.isAnonymous && isSessionVerified) {
        fetchMyPosts();
      } else if (!user || user.isAnonymous) {
        router.push("/login");
      }
    }
  }, [user, isLoading, isSessionVerified, fetchMyPosts, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  /* ── User Reputation & Trust Stats Calculation ── */
  const { totalUpvotes, totalDownvotes, accuracyPercentage, totalViews } = useMemo(() => {
    let up = 0;
    let down = 0;
    let views = 0;
    for (const p of posts) {
      up += p.upvoteCount || 0;
      down += p.downvoteCount || 0;
      views += p.watchCount || 0;
    }
    const totalVotes = up + down;
    const accuracy = totalVotes > 0 ? Math.round((up / totalVotes) * 100) : 100;
    return { totalUpvotes: up, totalDownvotes: down, accuracyPercentage: accuracy, totalViews: views };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeTab === "all") return posts;
    if (activeTab === "live") return posts.filter((p) => p.status === "live" || p.isLive);
    if (activeTab === "upcoming") return posts.filter((p) => p.status === "upcoming" || p.isUpcoming);
    if (activeTab === "ended") return posts.filter((p) => p.status === "ended" || p.status === "archived");
    return posts;
  }, [posts, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 py-8 bg-background">
        <div className="rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  if (user && !user.isAnonymous && !isSessionVerified) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 py-8 bg-background">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium">Your sign-in could not be verified.</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect to the server and verify your session before opening the dashboard.</p>
          <button
            onClick={() => void validateSession()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Verify session
          </button>
        </div>
      </div>
    );
  }

  if (!user || user.isAnonymous) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1">
          ← Back to Map
        </Link>
        <h1 className="font-semibold text-lg flex-1">My Seva Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* User info card */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xl">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg truncate">{user.name ?? "Seva Hero"}</p>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center gap-1">
                  <Award className="w-3 h-3" /> Seva Hero
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Link
            href="/submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Create Listing
          </Link>
        </div>

        {/* ── Reputation & Accuracy Analytics Card ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Accuracy & Trust Score (Your Listings)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-center">
              <p className="text-2xl font-bold text-primary">{accuracyPercentage}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trust Score</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-center">
              <p className="text-2xl font-bold text-green-600">+{totalUpvotes}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Confirmed Active</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-center">
              <p className="text-2xl font-bold text-red-500">-{totalDownvotes}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reported Fake</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-center">
              <p className="text-2xl font-bold text-foreground">{posts.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Listings</p>
            </div>
          </div>
        </div>

        {/* ── My Verification Activity ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            My Verification Activity (Community Contributions)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Listings Confirmed</p>
                <p className="text-lg font-bold text-green-600">{interactionStats.confirmedCount}</p>
              </div>
              <ThumbsUp className="w-6 h-6 text-green-600/30" />
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Listings Reported</p>
                <p className="text-lg font-bold text-red-500">{interactionStats.reportedCount}</p>
              </div>
              <ThumbsDown className="w-6 h-6 text-red-500/30" />
            </div>
          </div>
        </div>

        {/* Posts section with Status Tabs */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/40 text-xs">
              {(["all", "live", "upcoming", "ended"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "all" ? "All" : tab === "live" ? "Live" : tab === "upcoming" ? "Upcoming" : "Ended"}
                </button>
              ))}
            </div>

            <button
              onClick={fetchMyPosts}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg border border-border/40 bg-card"
              title="Refresh listings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingPosts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-border/40 bg-card/50 h-44 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm p-4 text-center">{error}</div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-muted-foreground bg-card/30">
              <PlusCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No listings found in this category.</p>
              <Link href="/submit" className="mt-3 inline-block text-sm text-primary hover:underline font-medium">
                Create a listing →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onArchive={(id) => setPosts((prev) => prev.map((x) => x.id === id ? { ...x, status: "archived" } : x))}
                  onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
