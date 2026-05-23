// Generic SSE consumer with Last-Event-Id auto-reconnect (browser native).
// Per specs/02-front.md §3 — do not roll our own reconnect; let EventSource do it.
//
// SPEC NOTE: this will eventually replace src/hooks/useSSE.ts (the legacy hook bound to
// the pre-spec /api/events endpoint). Leaving useSSE.ts intact so App.tsx keeps working
// against the existing backend until the front terminal swaps the App entry point.

import { useEffect, useRef, useState } from "react";
import {
  EventTypeMap,
  safeParseEvent,
  type EventPayload,
  type EventType,
} from "@timbre/shared/contracts";

export type EventHandlers = {
  [T in EventType]?: (data: EventPayload<T>) => void;
};

export interface UseEventStreamOptions {
  enabled?: boolean;
  // Fired on transport state changes — useful for surface dots in the header.
  onOpen?: () => void;
  onError?: (ev: Event) => void;
}

export interface UseEventStreamResult {
  connected: boolean;
}

/**
 * Subscribe to a server-sent-event channel and dispatch parsed payloads to per-type handlers.
 *
 * - URL changes recreate the EventSource (which restarts from the server's perspective).
 * - Browser auto-reconnect via Last-Event-Id is honored — backend must serve replay on GET.
 * - Unknown event types are silently skipped (log+skip rule, api-contracts §9).
 */
export function useEventStream(
  url: string,
  handlers: EventHandlers,
  opts: UseEventStreamOptions = {},
): UseEventStreamResult {
  const [connected, setConnected] = useState(false);
  // Hold handlers in a ref so we don't tear down the connection on each render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (opts.enabled === false) {
      setConnected(false);
      return;
    }

    const es = new EventSource(url);

    es.onopen = () => {
      setConnected(true);
      optsRef.current.onOpen?.();
    };
    es.onerror = (ev) => {
      // Browser will auto-retry; we just surface the transport state.
      setConnected(false);
      optsRef.current.onError?.(ev);
    };

    // Subscribe to every event type in the contract.
    // SSE without a named `event:` field falls back to "message", so register that too
    // — the backend always names events, but server proxies sometimes strip the name.
    const types = Object.keys(EventTypeMap) as EventType[];
    const listeners: Array<{ type: string; fn: (ev: MessageEvent) => void }> = [];

    for (const type of types) {
      const fn = (ev: MessageEvent) => {
        let raw: unknown;
        try {
          raw = JSON.parse(ev.data);
        } catch {
          return;
        }
        const parsed = safeParseEvent(type, raw);
        if (!parsed) return;
        const handler = handlersRef.current[type];
        if (handler) (handler as (d: EventPayload<EventType>) => void)(parsed);
      };
      es.addEventListener(type, fn as EventListener);
      listeners.push({ type, fn });
    }

    return () => {
      for (const { type, fn } of listeners) {
        es.removeEventListener(type, fn as EventListener);
      }
      es.close();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, opts.enabled]);

  return { connected };
}
