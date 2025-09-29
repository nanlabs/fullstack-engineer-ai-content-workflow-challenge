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
      if (data.draft.id === draftId) {
        onDraftUpdate(data.draft);
      }
    },
    [draftId, onDraftUpdate]
  );

  const handleTranslationStateUpdated = useCallback(
    (data: { draftId: string; language: string; state: string }) => {
      if (data.draftId === draftId) {
        onTranslationStateUpdate(data.language, data.state);
      }
    },
    [draftId, onTranslationStateUpdate]
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for draft updates
    socket.on("draft-updated", handleDraftUpdated);

    // Listen for translation state updates
    socket.on("translation-state-updated", handleTranslationStateUpdated);

    return () => {
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
