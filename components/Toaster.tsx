"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastListeners: Array<(toast: Toast) => void> = [];
let toastId = 0;

export function toast({
  title,
  description,
  variant = "default",
}: Omit<Toast, "id">) {
  const id = String(++toastId);
  toastListeners.forEach((fn) => fn({ id, title, description, variant }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== t.id));
      }, 4000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== listener);
    };
  }, []);

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-full flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-top-3 fade-in duration-200 ${
            t.variant === "destructive"
              ? "bg-destructive/95 text-destructive-foreground border-destructive/80 shadow-destructive/20"
              : "bg-card/95 text-card-foreground border-border/80 shadow-black/10"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight">{t.title}</p>
            {t.description && (
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => remove(t.id)}
            className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0 text-current/70 hover:text-current"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

