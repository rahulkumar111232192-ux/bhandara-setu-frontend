"use client";

import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchOverlayProps {
  visible: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClose: () => void;
}

export function SearchOverlay({ visible, searchTerm, onSearchChange, onClose }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (visible && inputRef.current) {
          inputRef.current.focus();
        }
      }
      if (e.key === "Escape" && visible) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[999] w-full max-w-md -translate-x-1/2 animate-slide-up px-4 md:max-w-lg">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for bhandara events... (Cmd/Ctrl + K to focus)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-12 w-full rounded-full pl-10 pr-10 text-sm outline-none glass focus:ring-2 focus:ring-primary/20"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3.5 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
