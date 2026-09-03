"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bhandara, CATEGORY_MAP } from "@/lib/types";
import { X, Share2, MapPin, Calendar, Clock, UtensilsCrossed, Eye, Star, ThumbsUp, ThumbsDown, User, BadgeCheck, Navigation, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import CommentSection from "@/components/CommentSection";
import { toast } from "@/components/Toaster";


interface PostDetailProps {
  bhandara: Bhandara | null;
  open: boolean;
  onClose: () => void;
  onPostUpdated?: (updated: Bhandara) => void;
}

export default function PostDetail({ bhandara, open, onClose, onPostUpdated }: PostDetailProps) {
  const { user, ensureAnonymousIdentity } = useAuth();
  const [reactionLoading, setReactionLoading] = useState(false);
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const isOwner = Boolean(user && !user.isAnonymous && bhandara && String(user.id) === String(bhandara.userId));

  if (!open || !bhandara) return null;

  const categoryInfo = bhandara.category && CATEGORY_MAP[bhandara.category]
    ? CATEGORY_MAP[bhandara.category]
    : CATEGORY_MAP["other"];

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?post=${bhandara.id}`
    : `/?post=${bhandara.id}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: bhandara.title,
        text: `Check out ${bhandara.title} on Bhandara Setu!`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Direct listing link copied to clipboard.",
      });
    }
  };

  const handleDirections = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${bhandara.latitude},${bhandara.longitude}`, "_blank");
  };

  const handleVote = async (vote: "upvote" | "downvote") => {
    if (!navigator.geolocation) {
      toast({
        title: "Location required",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setReactionLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await ensureAnonymousIdentity();
          const res = await apiFetch(`/api/posts/${bhandara.id}/votes`, {
            method: "POST",
            body: JSON.stringify({
              vote,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            toast({
              title: "Vote cannot be recorded",
              description: data.message || "You must be near the bhandara location to vote.",
              variant: "destructive",
            });
            return;
          }

          setUserVote(vote);
          if (data.data && onPostUpdated) {
            onPostUpdated(data.data);
          }

          toast({
            title: vote === "upvote" ? "Confirmed active!" : "Report recorded",
            description: "Thank you for verifying! Your input helps the community.",
          });
        } catch (error: any) {
          toast({
            title: "Vote failed",
            description: error?.message || "Could not submit vote.",
            variant: "destructive",
          });
        } finally {
          setReactionLoading(false);
        }
      },
      (err) => {
        setReactionLoading(false);
        toast({
          title: "Location access needed",
          description: "Please allow location access to verify your proximity and cast a vote.",
          variant: "destructive",
        });
      },
      { maximumAge: 30000, timeout: 6000, enableHighAccuracy: true }
    );
  };

  const menuItems = bhandara.menu ? bhandara.menu.split(",").map(i => i.trim()) : [];

  return (
    <>
      {/* ── DESKTOP RIGHT DRAWER (No dark blur, map stays visible) ── */}
      <div className="hidden md:block fixed top-0 right-0 z-[1100] h-full w-full max-w-md pointer-events-none">
        <div className="relative w-full h-full glass-strong overflow-y-auto scrollbar-thin animate-slide-in-right bg-background/95 border-l border-border shadow-2xl pointer-events-auto">
          
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex justify-between p-3 pointer-events-none">
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors pointer-events-auto"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors pointer-events-auto"
              title="Share listing link"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Hero Section */}
          {bhandara.imageUrl ? (
            <div className="relative h-56 w-full -mt-14">
              <img 
                src={bhandara.imageUrl} 
                alt={bhandara.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-5">
                <h1 className="text-2xl font-bold text-white mb-2">{bhandara.title}</h1>
              </div>
            </div>
          ) : (
            <div className="pt-16 pb-4 px-5 border-b border-border">
              <h1 className="text-2xl font-bold">{bhandara.title}</h1>
            </div>
          )}

          {/* Detail Body */}
          <div className="p-5 space-y-5">
            {/* Status Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                bhandara.isLive
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : bhandara.isUpcoming
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-muted text-muted-foreground border-transparent"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  bhandara.isLive ? "bg-green-500 animate-pulse-live" : bhandara.isUpcoming ? "bg-amber-500" : "bg-gray-400"
                )} />
                {bhandara.isLive ? 'Live Now' : bhandara.isUpcoming ? 'Upcoming Event' : 'Ended'}
              </div>
              
              <div 
                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                style={{ backgroundColor: categoryInfo.color + "20", color: categoryInfo.darkColor || categoryInfo.color }}
              >
                <span>{categoryInfo.icon}</span>
                {categoryInfo.label}
              </div>

              <button
                onClick={handleDirections}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </button>
            </div>

            {/* Description */}
            {(bhandara.description || bhandara.content) && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bhandara.description || bhandara.content}
              </p>
            )}

            {/* Info Card */}
            <div className="rounded-xl border bg-card/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {bhandara.isUpcoming ? "Scheduled Start" : "Started"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bhandara.startTime
                      ? new Date(bhandara.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                      : new Date(bhandara.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-xs text-muted-foreground">{bhandara.address || `${bhandara.latitude.toFixed(4)}, ${bhandara.longitude.toFixed(4)}`}</p>
                </div>
              </div>
            </div>

            {/* Contributor / Organizer Ownership Card */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                    {bhandara.organizer?.name
                      ? bhandara.organizer.name.charAt(0).toUpperCase()
                      : bhandara.user?.name
                      ? bhandara.user.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Shared by</span>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {bhandara.organizer?.name ||
                          bhandara.user?.name ||
                          (bhandara.user?.email ? bhandara.user.email.split("@")[0] : "Community Volunteer")}
                      </span>
                      {bhandara.organizer?.isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium bg-green-500/10 px-1.5 py-0.5 rounded">
                          <BadgeCheck className="w-3 h-3 text-green-600" /> Verified Organizer
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[10px] text-primary font-semibold bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded">
                          👑 Created by you
                        </span>
                      )}
                    </div>
                    {bhandara.organizer?.bio && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 italic">
                        {bhandara.organizer.bio}
                      </p>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <Link
                    href={`/submit?edit=${bhandara.id}`}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Link>
                )}
              </div>
            </div>

            {/* Menu */}
            {menuItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  Menu / Food Items
                </h3>
                <div className="flex flex-wrap gap-2">
                  {menuItems.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-6 py-2 border-y border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span className="font-medium text-foreground">{bhandara.watchCount} views</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                <ThumbsUp className="w-4 h-4" />
                <span>{bhandara.upvoteCount ?? 0} confirmed</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-500 font-medium">
                <ThumbsDown className="w-4 h-4" />
                <span>{bhandara.downvoteCount ?? 0} reported</span>
              </div>
            </div>

            {/* Community Signal */}
            <div className="rounded-2xl border p-4 bg-muted/30 space-y-3">
              <div>
                <h3 className="font-semibold text-sm">Community Verification</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you within 500m of this event? Verify if food is actively being served to help neighbors.
                </p>
              </div>

              <div className="flex gap-2.5">
                <button 
                  onClick={() => handleVote("upvote")}
                  disabled={reactionLoading}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                    userVote === "upvote"
                      ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300 font-semibold shadow-xs"
                      : "bg-card hover:border-green-500/50 hover:bg-green-500/5"
                  )}
                >
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-semibold">✅ Food Available ({bhandara.upvoteCount ?? 0})</span>
                </button>
                <button 
                  onClick={() => handleVote("downvote")}
                  disabled={reactionLoading}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                    userVote === "downvote"
                      ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold shadow-xs"
                      : "bg-card hover:border-amber-500/50 hover:bg-amber-500/5"
                  )}
                >
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-semibold">⏱ Event Ended ({bhandara.downvoteCount ?? 0})</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm("Report this listing as fake or misleading?")) {
                    handleVote("downvote");
                  }
                }}
                disabled={reactionLoading}
                className="w-full py-1.5 text-center text-xs text-red-500/80 hover:text-red-600 hover:bg-red-500/5 rounded-lg transition-colors"
              >
                ⚠️ Report listing as fake or inactive
              </button>
            </div>

            {/* Comments */}
            <div className="border-t border-border pt-4">
              <CommentSection
                postId={bhandara.id}
                postOwnerId={bhandara.userId}
              />
            </div>

            <div className="h-6" />
          </div>
        </div>
      </div>

      {/* ── MOBILE EXPANDABLE BOTTOM SHEET (Shutter Window) ── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-[1100] pointer-events-none">
        <div
          className={cn(
            "relative w-full glass-strong rounded-t-3xl border-t border-border shadow-2xl bg-background/95 transition-all duration-300 pointer-events-auto flex flex-col overflow-hidden",
            isExpanded ? "h-[85vh]" : "h-[45vh]"
          )}
        >
          {/* Draggable Shutter Handle Header */}
          <div 
            onClick={() => setIsExpanded((v) => !v)}
            className="w-full pt-3 pb-2 flex flex-col items-center cursor-pointer select-none bg-muted/20 border-b border-border/40"
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-2" />
            <div className="w-full px-4 flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="font-bold text-sm truncate">{bhandara.title}</h2>
                <p className="text-[11px] text-muted-foreground truncate">{bhandara.address || "Location active"}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  className="p-2 rounded-full bg-muted text-foreground hover:bg-muted/80"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="p-2 rounded-full bg-muted text-foreground hover:bg-muted/80"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content inside bottom sheet */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* Status + Directions */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                bhandara.isLive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-muted text-muted-foreground"
              )}>
                <span className={cn("w-2 h-2 rounded-full", bhandara.isLive ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                {bhandara.isLive ? "Live Now" : bhandara.isUpcoming ? "Upcoming" : "Ended"}
              </div>
              <button
                onClick={handleDirections}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" /> Navigate
              </button>
            </div>

            {/* Description */}
            {(bhandara.description || bhandara.content) && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {bhandara.description || bhandara.content}
              </p>
            )}

            {/* Mobile Contributor / Organizer Ownership Card */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                    {bhandara.organizer?.name
                      ? bhandara.organizer.name.charAt(0).toUpperCase()
                      : bhandara.user?.name
                      ? bhandara.user.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">Shared by</span>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {bhandara.organizer?.name ||
                          bhandara.user?.name ||
                          (bhandara.user?.email ? bhandara.user.email.split("@")[0] : "Community Volunteer")}
                      </span>
                      {bhandara.organizer?.isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-green-600 font-medium bg-green-500/10 px-1 py-0.2 rounded">
                          <BadgeCheck className="w-2.5 h-2.5 text-green-600" /> Verified
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[9px] text-primary font-semibold bg-primary/10 border border-primary/25 px-1 py-0.2 rounded">
                          👑 You
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <Link
                    href={`/submit?edit=${bhandara.id}`}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </Link>
                )}
              </div>
            </div>

            {/* Fast Community Verification */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleVote("upvote")}
                  disabled={reactionLoading}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold",
                    userVote === "upvote" ? "bg-green-500/20 border-green-500 text-green-700" : "bg-card"
                  )}
                >
                  <ThumbsUp className="w-4 h-4 text-green-600" /> ✅ Available ({bhandara.upvoteCount ?? 0})
                </button>
                <button 
                  onClick={() => handleVote("downvote")}
                  disabled={reactionLoading}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold",
                    userVote === "downvote" ? "bg-amber-500/20 border-amber-500 text-amber-700" : "bg-card"
                  )}
                >
                  <Clock className="w-4 h-4 text-amber-500" /> ⏱ Ended ({bhandara.downvoteCount ?? 0})
                </button>
              </div>
              <button
                onClick={() => {
                  if (confirm("Report this listing as fake or misleading?")) handleVote("downvote");
                }}
                disabled={reactionLoading}
                className="py-1 text-center text-[11px] text-red-500/80 hover:text-red-600 transition-colors"
              >
                ⚠️ Report as fake
              </button>
            </div>

            {/* Comments inside bottom sheet */}
            <div className="border-t border-border pt-3">
              <CommentSection postId={bhandara.id} postOwnerId={bhandara.userId} />
            </div>

            <div className="h-8" />
          </div>
        </div>
      </div>
    </>
  );
}

