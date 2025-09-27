"use client";

import { useEffect, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { Draft } from "@/types";

interface UseDraftUpdatesProps {
  draftId: string;
  onDraftUpdate: (updatedDraft: Draft) => void;
  onTranslationStateUpdate: (language: string, state: string) => void;
}

export const useDraftUpdates = ({
  draftId,
  onDraftUpdate,
  onTranslationStateUpdate,
}: UseDraftUpdatesProps) => {
  const { socket, isConnected } = useWebSocket();

  const handleDraftUpdated = useCallback(
    (data: { contentPieceId: string; draft: Draft }) => {
      console.log(`[useDraftUpdates] Received draft-updated event:`, {
        receivedDraftId: data.draft.id,
        expectedDraftId: draftId,
        matches: data.draft.id === draftId,
      });

      if (data.draft.id === draftId) {
        console.log(
          `[useDraftUpdates] Updating draft ${draftId} with new data:`,
          data.draft
        );
        onDraftUpdate(data.draft);
      }
    },
    [draftId, onDraftUpdate]
  );

  const handleTranslationStateUpdated = useCallback(
    (data: { draftId: string; language: string; state: string }) => {
      console.log(
        `[useDraftUpdates] Received translation-state-updated event:`,
        {
          receivedDraftId: data.draftId,
          expectedDraftId: draftId,
          language: data.language,
          state: data.state,
          matches: data.draftId === draftId,
        }
      );

      if (data.draftId === draftId) {
        console.log(
          `[useDraftUpdates] Updating translation state for draft ${draftId}:`,
          data.language,
          data.state
        );
        onTranslationStateUpdate(data.language, data.state);
      }
    },
    [draftId, onTranslationStateUpdate]
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log(
      `[useDraftUpdates] Setting up WebSocket listeners for draft ${draftId}`
    );

    // Listen for draft updates
    socket.on("draft-updated", handleDraftUpdated);

    // Listen for translation state updates
    socket.on("translation-state-updated", handleTranslationStateUpdated);

    return () => {
      console.log(
        `[useDraftUpdates] Cleaning up WebSocket listeners for draft ${draftId}`
      );
      socket.off("draft-updated", handleDraftUpdated);
      socket.off("translation-state-updated", handleTranslationStateUpdated);
    };
  }, [
    socket,
    isConnected,
    draftId,
    handleDraftUpdated,
    handleTranslationStateUpdated,
  ]);

  return {
    isConnected,
  };
};
