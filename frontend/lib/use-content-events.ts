"use client";

import { useEffect } from "react";

import { getEventsUrl } from "@/lib/api";

export function useContentEvents(
  campaignId: string,
  onMessage: (contentPieceId: string) => void,
): void {
  useEffect(() => {
    const eventSource = new EventSource(getEventsUrl());

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          campaign_id?: string;
          content_piece_id?: string;
        };
        if (payload.campaign_id === campaignId && payload.content_piece_id) {
          onMessage(payload.content_piece_id);
        }
      } catch {
        // Ignore malformed messages to keep the UI subscribed.
      }
    };

    return () => {
      eventSource.close();
    };
  }, [campaignId, onMessage]);
}
