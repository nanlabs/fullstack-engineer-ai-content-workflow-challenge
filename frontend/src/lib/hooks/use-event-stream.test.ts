import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEventStream } from "./use-event-stream";

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  url: string;
  onerror: ((event: Event) => void) | null = null;
  private listeners: Record<string, EventListener[]> = {};
  readyState = 1;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== listener);
  }

  close() {
    this.readyState = 2;
  }

  emit(type: string, data: unknown) {
    const event = { type, data: JSON.stringify(data) } as MessageEvent;
    (this.listeners[type] ?? []).forEach((l) => l(event));
  }

  listenerCount(type: string) {
    return (this.listeners[type] ?? []).length;
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEventStream", () => {
  it("creates an EventSource when url and enabled=true", () => {
    renderHook(() => useEventStream("/api/campaigns/1/events", vi.fn(), true));
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toContain("/api/campaigns/1/events");
  });

  it("does NOT create an EventSource when url is null", () => {
    renderHook(() => useEventStream(null, vi.fn(), true));
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("does NOT create an EventSource when enabled=false", () => {
    renderHook(() => useEventStream("/api/campaigns/1/events", vi.fn(), false));
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("attaches listeners for known SSE event types", () => {
    renderHook(() => useEventStream("/api/campaigns/1/events", vi.fn(), true));
    const es = FakeEventSource.instances[0];
    expect(es.listenerCount("workflow.started")).toBe(1);
    expect(es.listenerCount("workflow.completed")).toBe(1);
    expect(es.listenerCount("draft.updated")).toBe(1);
  });

  it("calls handler with parsed event data", () => {
    const handler = vi.fn();
    renderHook(() => useEventStream("/api/campaigns/1/events", handler, true));
    const es = FakeEventSource.instances[0];
    es.emit("workflow.started", { payload: { thread_id: "t1" } });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "workflow.started", payload: { thread_id: "t1" } })
    );
  });

  it("closes the EventSource and removes listeners on unmount", () => {
    const { unmount } = renderHook(() => useEventStream("/api/campaigns/1/events", vi.fn(), true));
    const es = FakeEventSource.instances[0];
    unmount();
    expect(es.readyState).toBe(2);
    expect(es.listenerCount("workflow.started")).toBe(0);
  });

  it("uses full URL as-is when url already starts with http", () => {
    renderHook(() => useEventStream("http://custom-host/events", vi.fn(), true));
    expect(FakeEventSource.instances[0].url).toBe("http://custom-host/events");
  });
});
