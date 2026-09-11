import { markNotificationSent } from "./notifications";

// Client-side manager for Upcoming Bhandara Event Reminders

const REMINDERS_KEY = "bhandara_event_reminders";

export function getReminders(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isReminderSet(postId: number): boolean {
  const list = getReminders();
  return list.includes(postId);
}

export function toggleReminder(postId: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getReminders();
    const exists = current.includes(postId);
    let next: number[];
    if (exists) {
      next = current.filter((id) => id !== postId);
    } else {
      next = [...current, postId];
    }
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("bhandara-reminders-changed", { detail: { postId, active: !exists } }));
    return !exists;
  } catch {
    return false;
  }
}

export function clearReminder(postId: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReminders();
    const next = current.filter((id) => id !== postId);
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("bhandara-reminders-changed", { detail: { postId, active: false } }));
  } catch {}
}

/**
 * Marks a reminder as fired: clears it from active list and records it in sent notifications
 * so it is NEVER triggered again.
 */
export function markReminderFired(postId: number): void {
  clearReminder(postId);
  markNotificationSent(postId, "reminder");
}
