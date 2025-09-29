"use client";

import { useState, useEffect, useCallback } from "react";
import { socketService } from "@/lib/websocket/socket";

interface ChainOfThoughtsState {
  isVisible: boolean;
  currentStep: string;
  message: string;
  progress: number;
  contentPieceId: string | null;
}

export const useChainOfThoughts = () => {
  const [state, setState] = useState<ChainOfThoughtsState>({
    isVisible: false,
    currentStep: "",
    message: "",
    progress: 0,
    contentPieceId: null,
  });

  const showChainOfThoughts = useCallback((contentPieceId: string) => {
    setState({
      isVisible: true,
      currentStep: "analyzing",
      message: "Starting AI generation...",
      progress: 0,
      contentPieceId,
    });
  }, []);

  const hideChainOfThoughts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  useEffect(() => {
    const handleChainOfThoughts = (data: {
      contentPieceId: string;
      thought: { step: string; message: string; progress: number };
    }) => {
      console.log("Chain of thoughts received:", data);
      console.log("Current contentPieceId:", state.contentPieceId);

      // Only update if this is for the current content piece
      if (state.contentPieceId === data.contentPieceId) {
        console.log("Updating chain of thoughts state:", data.thought);
        setState((prev) => ({
          ...prev,
          currentStep: data.thought.step,
          message: data.thought.message,
          progress: data.thought.progress,
        }));
      } else {
        console.log("Ignoring chain of thoughts - different content piece");
      }
    };

    socketService.onChainOfThoughts(handleChainOfThoughts);

    return () => {
      socketService.off(
        "chain-of-thoughts",
        handleChainOfThoughts as (...args: unknown[]) => void
      );
    };
  }, [state.contentPieceId]);

  return {
    ...state,
    showChainOfThoughts,
    hideChainOfThoughts,
  };
};
