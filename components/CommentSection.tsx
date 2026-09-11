"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Send, Trash2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch, getApiBaseUrl } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

interface CommentUser { id: number; name: string | null; }

interface CommentData {
  id: number;
  postId: number;
  parentId: number | null;
  text: string | null;
  isDeleted: boolean;
  user: CommentUser | null;
  replies: CommentData[];
  replyCount: number;
  createdAt: string;
}

interface CommentSectionProps {
  postId: number;
  postOwnerId: number | null;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentItem({
  comment,
  postId,
  postOwnerId,
  currentUserId,
  onReplyPosted,
  onDeleted,
}: {
  comment: CommentData;
  postId: number;
  postOwnerId: number | null;
  currentUserId: number | null;
  onReplyPosted: (reply: CommentData) => void;
  onDeleted: (commentId: number) => void;
}) {
  const { user, ensureAnonymousIdentity } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canDelete =
    currentUserId !== null &&
    (comment.user?.id === currentUserId || postOwnerId === currentUserId);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await apiFetch(`/api/posts/${postId}/comments/${comment.id}`, { method: "DELETE" });
      onDeleted(comment.id);
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await ensureAnonymousIdentity();
      const res = await apiFetch(`/api/posts/${postId}/comments/${comment.id}/replies`, {
        method: "POST",
        body: JSON.stringify({
          text: replyText.trim(),
          authorName: user?.name || "Visitor",
        }),
      });
      const data = await res.json();
      if (data.status === 201) {
        onReplyPosted(data.data);
        setReplyText("");
        setReplyOpen(false);
        setShowReplies(true);
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
          {comment.isDeleted ? "?" : (comment.user?.name?.[0]?.toUpperCase() ?? "U")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {!comment.isDeleted && (
              <span className="text-xs font-semibold text-foreground">
                {comment.user?.name ?? "Community Visitor"}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className={`text-sm mt-0.5 leading-snug ${comment.isDeleted ? "italic text-muted-foreground" : "text-foreground"}`}>
            {comment.isDeleted ? "This comment was removed." : comment.text}
          </p>
          {!comment.isDeleted && (
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setReplyOpen((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
              {comment.replyCount > 0 && (
                <button
                  onClick={() => setShowReplies((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="text-xs text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Inline reply input */}
      {replyOpen && (
        <div className="ml-9 flex gap-2 mt-1">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
            placeholder="Write a reply…"
            className="flex-1 text-sm rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleReply}
            disabled={submitting || !replyText.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Nested replies */}
      {showReplies && comment.replies.length > 0 && (
        <div className="ml-9 flex flex-col gap-3 border-l border-border/40 pl-3">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              postId={postId}
              postOwnerId={postOwnerId}
              currentUserId={currentUserId}
              onReplyPosted={() => {}}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, postOwnerId }: CommentSectionProps) {
  const { user, ensureAnonymousIdentity } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);

  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const currentUserId = user && !user.isAnonymous ? (user.id as number) : null;

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      if (data.status === 200) setComments(data.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();

    // Listen for live comment events on SSE stream
    const apiUrl = getApiBaseUrl();
    const es = new EventSource(`${apiUrl}/api/events/stream`);
    esRef.current = es;

    es.addEventListener("comment:new", (e) => {
      const c: CommentData = JSON.parse(e.data);
      if (c.postId !== postId) return;
      if (c.parentId === null) {
        // Top-level comment
        setComments((prev) => {
          if (prev.some((x) => x.id === c.id)) return prev;
          return [c, ...prev];
        });
      } else {
        // Reply — insert under parent
        setComments((prev) =>
          prev.map((p) =>
            p.id === c.parentId
              ? { ...p, replies: [...(p.replies ?? []).filter((r) => r.id !== c.id), c], replyCount: p.replyCount + 1 }
              : p
          )
        );
      }
    });

    es.addEventListener("comment:deleted", (e) => {
      const { commentId }: { postId: number; commentId: number } = JSON.parse(e.data);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, isDeleted: true, text: null, user: null }
            : { ...c, replies: c.replies.map((r) => r.id === commentId ? { ...r, isDeleted: true, text: null, user: null } : r) }
        )
      );
    });

    return () => es.close();
  }, [postId, fetchComments]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await ensureAnonymousIdentity();
      const res = await apiFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          text: text.trim(),
          authorName: user?.name || "Visitor",
        }),
      });
      const data = await res.json();
      if (data.status === 201) {
        setComments((prev) => [data.data, ...prev]);
        setText("");
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Comments {comments.length > 0 && <span className="text-muted-foreground font-normal">({comments.length})</span>}
      </h3>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          placeholder="Share your update or ask about food items…"
          className="flex-1 text-sm rounded-xl border border-border/60 bg-background/60 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>


      {/* List */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              postOwnerId={postOwnerId}
              currentUserId={currentUserId}
              onReplyPosted={(reply) =>
                setComments((prev) =>
                  prev.map((p) =>
                    p.id === reply.parentId
                      ? { ...p, replies: [...p.replies.filter((r) => r.id !== reply.id), reply], replyCount: p.replyCount + 1 }
                      : p
                  )
                )
              }
              onDeleted={(id) =>
                setComments((prev) =>
                  prev.map((p) =>
                    p.id === id
                      ? { ...p, isDeleted: true, text: null, user: null }
                      : { ...p, replies: p.replies.map((r) => r.id === id ? { ...r, isDeleted: true, text: null, user: null } : r) }
                  )
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
