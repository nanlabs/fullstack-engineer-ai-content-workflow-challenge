import { useEffect, useRef } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const SSE_EVENT_TYPES = [
  "workflow.started",
  "workflow.node.started",
  "workflow.node.completed",
  "workflow.tokens",
  "workflow.draft.created",
  "workflow.awaiting_human",
  "workflow.resumed",
  "workflow.completed",
  "workflow.failed",
  "draft.updated",
] as const;

type SseEventType = (typeof SSE_EVENT_TYPES)[number];

export type SseEvent = {
  type: SseEventType | string;
  payload?: unknown;
  [k: string]: unknown;
};

type EventHandler = (event: SseEvent) => void;

export function useEventStream(url: string | null, handler: EventHandler, enabled: boolean = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!url || !enabled) return;
    const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    const es = new EventSource(fullUrl);

    const onAny = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        handlerRef.current({ type: e.type, ...data });
      } catch (err) {
        console.warn("Failed to parse SSE event", err);
      }
    };

    for (const t of SSE_EVENT_TYPES) {
      es.addEventListener(t, onAny as EventListener);
    }

    es.onerror = () => {
      console.debug("SSE error, browser will reconnect");
    };

    return () => {
      for (const t of SSE_EVENT_TYPES) {
        es.removeEventListener(t, onAny as EventListener);
      }
      es.close();
    };
  }, [url, enabled]);
}
