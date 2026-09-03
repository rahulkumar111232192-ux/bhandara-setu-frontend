"use client";

import React, { useEffect, useRef } from "react";
import { SortOption } from "@/lib/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortDropdownProps {
  visible: boolean;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onClose: () => void;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: string; note?: string }[] = [
  { value: "newest", label: "Newest First", icon: "📅" },
  { value: "nearest", label: "Nearest to Me", icon: "📍", note: "requires location" },
  { value: "rating", label: "Highest Rated", icon: "⭐" },
  { value: "views", label: "Most Viewed", icon: "👁️" },
];

export function SortDropdown({ visible, sortBy, onSortChange, onClose }: SortDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div 
      ref={dropdownRef}
      className="fixed left-20 top-1/2 z-[999] w-56 -translate-y-1/2 animate-scale-in rounded-2xl p-4 glass"
      style={{ transform: "translateY(-10%)" }}
    >
      <h3 className="mb-3 px-1 text-sm font-semibold text-foreground">Sort By</h3>
      
      <div className="flex flex-col gap-1">
        {SORT_OPTIONS.map((option) => {
          const isActive = sortBy === option.value;
          return (
            <div
              key={option.value}
              onClick={() => {
                onSortChange(option.value);
                onClose();
              }}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
                isActive 
                  ? "bg-primary/10 font-semibold text-primary" 
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <span>{option.icon}</span>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.note && (
                    <span className="text-[10px] font-normal opacity-70">{option.note}</span>
                  )}
                </div>
              </div>
              {isActive && <Check className="h-4 w-4" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
