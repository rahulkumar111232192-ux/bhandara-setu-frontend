"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface MealWord {
  script: string;
  transliteration: string;
  region: string;
  emoji: string;
}

export const REGIONAL_MEAL_WORDS: MealWord[] = [
  { script: "भंडारा", transliteration: "Bhandara", region: "Hindi / North India", emoji: "🍲" },
  { script: "ਲੰਗਰ", transliteration: "Langar", region: "Punjabi / Sewa", emoji: "🛕" },
  { script: "अन्नदानम्", transliteration: "Annadanam", region: "Sanskrit / Telugu / Tamil", emoji: "🙏" },
  { script: "महाप्रसाद", transliteration: "Mahaprasad", region: "Odia / Marathi / Gujarati", emoji: "✨" },
  { script: "ಅನ್ನದಾನ", transliteration: "Annadaana", region: "Kannada", emoji: "🍛" },
  { script: "அன்னதானம்", transliteration: "Annadhanam", region: "Tamil Nadu", emoji: "🌿" },
  { script: "അന്നദാനം", transliteration: "Annadanam", region: "Kerala / Malayalam", emoji: "🥥" },
  { script: "Free Meal", transliteration: "Community Feast", region: "English / All", emoji: "🤝" },
];

interface RevolvingTitleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}

export function RevolvingTitle({
  className,
  size = "md",
  showSubtitle = true,
}: RevolvingTitleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % REGIONAL_MEAL_WORDS.length);
        setIsFlipping(false);
      }, 350);
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  const current = REGIONAL_MEAL_WORDS[currentIndex];

  const sizeClasses = {
    sm: "text-xs font-semibold",
    md: "text-sm font-bold sm:text-base",
    lg: "text-lg font-bold sm:text-2xl",
  };

  return (
    <div className={cn("inline-flex flex-col select-none", className)}>
      <div className="flex items-center gap-1.5 leading-none">
        <div
          className="relative inline-block overflow-hidden align-middle"
          title={`${current.transliteration} — ${current.region}`}
        >
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 transform-gpu",
              "bg-primary/15 text-primary border border-primary/30 shadow-xs",
              sizeClasses[size],
              isFlipping
                ? "-rotate-x-90 opacity-0 -translate-y-2 scale-95"
                : "rotate-x-0 opacity-100 translate-y-0 scale-100"
            )}
          >
            <span>{current.emoji}</span>
            <span className="font-extrabold tracking-tight">{current.script}</span>
            <span className="text-[0.75em] opacity-85 font-medium hidden sm:inline">
              ({current.transliteration})
            </span>
          </div>
        </div>

        <span
          className={cn(
            "font-extrabold font-headline tracking-tight text-foreground",
            sizeClasses[size]
          )}
        >
          Setu
        </span>
      </div>

      {showSubtitle && (
        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-1 animate-fade-in">
          <span>{current.region}</span>
          <span>•</span>
          <span className="text-primary font-semibold">Free Meals</span>
        </span>
      )}
    </div>
  );
}
