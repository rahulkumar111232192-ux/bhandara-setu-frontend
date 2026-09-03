"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Soup, PlusCircle, Search, SlidersHorizontal, ArrowUpDown, 
  Sun, Moon, LocateFixed, Loader2, LogIn 
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface MapToolbarProps {
  onSearchToggle: () => void;
  onFilterToggle: () => void;
  onSortToggle: () => void;
  onLocateMe: () => void;
  locating: boolean;
}

function TooltipButton({ icon: Icon, label, onClick, href, isActive, loading }: any) {
  const [hovered, setHovered] = useState(false);
  
  const content = (
    <div 
      className={cn(
        "relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-all duration-200",
        isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
      )}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      
      {hovered && (
        <div className="absolute left-full ml-3 animate-scale-in whitespace-nowrap rounded-lg px-2 py-1 text-xs glass z-50">
          {label}
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function MapToolbar({ onSearchToggle, onFilterToggle, onSortToggle, onLocateMe, locating }: MapToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="fixed left-4 top-1/2 z-[1000] hidden -translate-y-1/2 flex-col gap-1 rounded-2xl p-2 glass md:flex shadow-xl border border-border/60">
      <Link
        href="/"
        className="flex flex-col h-auto w-11 items-center justify-center rounded-xl text-primary transition-all duration-200 hover:bg-primary/10 py-2 group"
        title="Bhandara Setu — Free Community Meals"
      >
        <Soup className="h-6 w-6 group-hover:scale-110 transition-transform" />
        <span className="text-[7px] font-extrabold mt-0.5 tracking-wider text-primary">SETU</span>
      </Link>
      
      <div className="mx-2 my-1 h-px bg-border/50" />
      
      <TooltipButton icon={PlusCircle} label="Share Free Meal" href="/submit" />
      <TooltipButton icon={Search} label="Search Meals" onClick={onSearchToggle} />
      <TooltipButton icon={SlidersHorizontal} label="Filter Events" onClick={onFilterToggle} />
      <TooltipButton icon={ArrowUpDown} label="Sort Events" onClick={onSortToggle} />
      
      <div className="mx-2 my-1 h-px bg-border/50" />
      
      <TooltipButton 
        icon={theme === "dark" ? Sun : Moon} 
        label={theme === "dark" ? "Light Mode" : "Dark Mode"} 
        onClick={toggleTheme} 
      />
      <TooltipButton 
        icon={LocateFixed} 
        label="Locate Me Fast" 
        onClick={onLocateMe} 
        loading={locating} 
      />
      
      <div className="mx-2 my-1 h-px bg-border/50" />
      
      {user ? (
        <Link
          href="/profile"
          className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 hover:bg-primary/10"
          title={`Profile (${user.name ?? "User"})`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary border border-primary/30">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
        </Link>
      ) : (
        <TooltipButton icon={LogIn} label="Sign In" href="/login" />
      )}
    </div>
  );
}

export function MobileBottomBar({ onSearchToggle, onFilterToggle, onSortToggle, onLocateMe, locating }: MapToolbarProps) {
  const { user } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] flex items-center justify-around py-1.5 px-2 glass md:hidden border-t border-border/60 bg-background/95 backdrop-blur-lg">
      <Link href="/" className="flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-1 text-primary">
        <Soup className="h-5 w-5" />
        <span className="text-[10px] font-semibold">Home</span>
      </Link>
      <button onClick={onSearchToggle} className="flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-1 text-muted-foreground hover:text-foreground">
        <Search className="h-5 w-5" />
        <span className="text-[10px] font-medium">Search</span>
      </button>
      <Link href="/submit" className="flex flex-col items-center justify-center gap-0.5 min-w-[54px] py-1 px-1.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
        <PlusCircle className="h-5 w-5" />
        <span className="text-[10px] font-bold">Share</span>
      </Link>
      <button onClick={onFilterToggle} className="flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-1 text-muted-foreground hover:text-foreground">
        <SlidersHorizontal className="h-5 w-5" />
        <span className="text-[10px] font-medium">Filter</span>
      </button>
      <button onClick={onLocateMe} className="flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-1 text-muted-foreground hover:text-foreground">
        {locating ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <LocateFixed className="h-5 w-5" />}
        <span className="text-[10px] font-medium">Locate</span>
      </button>
      {user ? (
        <Link href="/profile" className="flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-1 hover:text-foreground">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Profile</span>
        </Link>
      ) : (
        <Link href="/login" className="flex flex-col items-center justify-center gap-0.5 min-w-[50px] py-1 text-muted-foreground hover:text-foreground">
          <LogIn className="h-5 w-5" />
          <span className="text-[10px] font-medium">Login</span>
        </Link>
      )}
    </div>
  );
}
