"use client";

import React, { useEffect, useRef } from "react";
import { FilterState, PostCategory, CATEGORY_MAP, DEFAULT_FILTERS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterDropdownProps {
  visible: boolean;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClose: () => void;
}

export function FilterDropdown({ visible, filters, onFiltersChange, onClose }: FilterDropdownProps) {
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

  const handleStatusChange = (status: "live" | "upcoming" | "ended") => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus as FilterState["status"] });
  };

  const handleCategoryChange = (category: PostCategory) => {
    const newCat = filters.category.includes(category)
      ? filters.category.filter((c) => c !== category)
      : [...filters.category, category];
    onFiltersChange({ ...filters, category: newCat });
  };

  const handleClear = () => {
    if (DEFAULT_FILTERS) {
      onFiltersChange(DEFAULT_FILTERS);
    }
  };

  const STATUS_OPTIONS: { value: "live" | "upcoming" | "ended"; label: string; icon: string }[] = [
    { value: "live", label: "Live Now (Serving)", icon: "🟢" },
    { value: "upcoming", label: "Upcoming (Scheduled)", icon: "⏳" },
    { value: "ended", label: "Ended / Closed", icon: "⏹️" },
  ];

  return (
    <div 
      ref={dropdownRef}
      className="fixed left-20 top-1/2 z-[999] w-72 -translate-y-1/2 animate-scale-in rounded-2xl p-5 glass shadow-2xl border border-border/60"
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">Filter Events</h3>
      
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Status</div>
        <div className="flex flex-col gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-sm hover:text-foreground">
              <input
                type="checkbox"
                checked={filters.status.includes(opt.value)}
                onChange={() => handleStatusChange(opt.value)}
                className="h-4 w-4 rounded border-border text-primary accent-primary"
              />
              <span className="flex items-center gap-1.5">
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="my-4 h-px bg-border/40" />

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Category</div>
        <div className="flex flex-col gap-2">
          {CATEGORY_MAP && (Object.entries(CATEGORY_MAP) as [PostCategory, any][]).map(([key, info]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.category.includes(key)}
                onChange={() => handleCategoryChange(key)}
                className="h-4 w-4 rounded border-border text-primary accent-primary"
              />
              <span className="flex items-center gap-1.5">
                <span>{info.icon}</span> <span>{info.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="my-4 h-px bg-border/40" />

      <div className="mb-4 flex flex-col gap-3">
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <span>Verified organizers only</span>
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => onFiltersChange({ ...filters, verifiedOnly: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <span>Has image</span>
          <input
            type="checkbox"
            checked={filters.hasImage}
            onChange={(e) => onFiltersChange({ ...filters, hasImage: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button 
          onClick={handleClear}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
        <button 
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
