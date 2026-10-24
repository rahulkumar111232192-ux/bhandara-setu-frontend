"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getApiBaseUrl } from "@/lib/api";

type EventHandler = (event: MessageEvent<string>) => void;
type EventName = "post:updated" | "post:expired" | "comment:new" | "comment:deleted" | "notification:nearby";

const RECONNECT_DELAY_MS = 3000;
const listeners = new Map<EventName, Set<EventHandler>>();
let source: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const attachedEvents = new Set<EventName>();

const closeStream = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  source?.close();
  source = null;
  attachedEvents.clear();
};

const connectStream = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (listeners.size === 0) return;
  if (!source) {
    source = new EventSource(`${getApiBaseUrl()}/api/events/stream`);
    const currentSource = source;
    currentSource.onerror = () => {
      if (source !== currentSource) return;
      closeStream();
      if (listeners.size > 0) {
        reconnectTimer = setTimeout(connectStream, RECONNECT_DELAY_MS);
      }
    };
  }

  for (const eventName of listeners.keys()) {
    if (attachedEvents.has(eventName)) continue;
    attachedEvents.add(eventName);
    source.addEventListener(eventName, (event) => {
      for (const handler of listeners.get(eventName) ?? []) {
        try {
          handler(event as MessageEvent<string>);
        } catch (error) {
          console.error(`Failed to handle ${eventName} event:`, error);
        }
      }
    });
  }
};

const subscribe = (eventName: EventName, handler: EventHandler) => {
  let handlers = listeners.get(eventName);
  if (!handlers) {
    handlers = new Set();
    listeners.set(eventName, handlers);
  }
  handlers.add(handler);
  connectStream();

  return () => {
    const currentHandlers = listeners.get(eventName);
    currentHandlers?.delete(handler);
    if (currentHandlers?.size === 0) listeners.delete(eventName);
    if (listeners.size === 0) closeStream();
  };
};

export function useServerEvent(eventName: EventName, handler: EventHandler) {
  const { isLoading } = useAuth();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (isLoading) return;
    return subscribe(eventName, (event) => handlerRef.current(event));
  }, [eventName, isLoading]);
}
