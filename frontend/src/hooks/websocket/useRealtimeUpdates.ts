import { useEffect, useCallback } from 'react';
import { socketService } from '@/lib/websocket/socket';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  WebSocketCampaignEvent, 
  WebSocketContentPieceEvent, 
  WebSocketDraftEvent 
} from '@/types';

interface RealtimeUpdateCallbacks {
  onCampaignCreated?: (campaign: WebSocketCampaignEvent) => void;
  onCampaignUpdated?: (campaign: WebSocketCampaignEvent) => void;
  onCampaignDeleted?: (data: { campaignId: string }) => void;
  onContentPieceCreated?: (contentPiece: WebSocketContentPieceEvent) => void;
  onContentPieceUpdated?: (contentPiece: WebSocketContentPieceEvent) => void;
  onContentPieceDeleted?: (data: { contentPieceId: string }) => void;
  onDraftGenerated?: (data: { contentPieceId: string; draft: WebSocketDraftEvent }) => void;
  onDraftUpdated?: (data: { contentPieceId: string; draft: WebSocketDraftEvent }) => void;
  onDraftDeleted?: (data: { contentPieceId: string; draftId: string }) => void;
  onAIGenerationStarted?: (data: { contentPieceId: string; prompt: string }) => void;
  onAIGenerationCompleted?: (data: { contentPieceId: string; draft: WebSocketDraftEvent }) => void;
  onAIGenerationFailed?: (data: { contentPieceId: string; error: string }) => void;
  onDocumentUploaded?: (data: { campaignId: string; document: Document }) => void;
  onDocumentDeleted?: (data: { campaignId: string; documentId: string }) => void;
  onChainOfThoughts?: (data: { contentPieceId: string; thought: { step: string; message: string; progress: number } }) => void;
}

export const useRealtimeUpdates = (callbacks: RealtimeUpdateCallbacks = {}) => {
  const { addToast } = useToast();

  // Default toast notifications
  const defaultCallbacks: RealtimeUpdateCallbacks = {
    onCampaignCreated: (campaign) => {
      addToast({
        type: 'success',
        title: 'New Campaign',
        message: `Campaign "${campaign.name}" was created`,
      });
    },
    onCampaignUpdated: () => {
      // Don't show toast for campaign updates - handled by direct API calls
    },
    onCampaignDeleted: () => {
      // Don't show toast for campaign deletions - handled by direct API calls
    },
    onContentPieceCreated: () => {
      // Don't show toast for content piece creation - handled by direct API calls
    },
    onContentPieceUpdated: () => {
      // Don't show toast for content piece updates - too noisy
    },
    onContentPieceDeleted: () => {
      // Don't show toast for content piece deletions - handled by direct API calls
    },
    onDraftGenerated: () => {
      addToast({
        type: 'success',
        title: 'AI Draft Generated',
        message: 'New AI draft is ready for review',
      });
    },
    onDraftUpdated: () => {
      // Don't show toast for draft updates - handled by individual components
    },
    onDraftDeleted: () => {
      // Don't show toast for draft deletions - handled by direct API calls
    },
    onAIGenerationStarted: () => {
      // Don't show toast for AI generation start - too noisy
    },
    onAIGenerationCompleted: () => {
      // Don't show toast for AI generation completion - handled by onDraftGenerated
    },
    onAIGenerationFailed: (data: { contentPieceId: string; error: string }) => {
      addToast({
        type: 'error',
        title: 'AI Generation Failed',
        message: data.error,
      });
    },
    onDocumentUploaded: () => {
      // Don't show toast for document uploads - handled by direct API calls
    },
    onDocumentDeleted: () => {
      // Don't show toast for document deletions - handled by direct API calls
    },
    onChainOfThoughts: () => {
      // Don't show toast for chain of thoughts - handled by UI component
    },
  };

  useEffect(() => {
    // Merge user callbacks with defaults
    const mergedCallbacks = { ...defaultCallbacks, ...callbacks };

    // Set up WebSocket event listeners
    socketService.onCampaignCreated(mergedCallbacks.onCampaignCreated!);
    socketService.onCampaignUpdated(mergedCallbacks.onCampaignUpdated!);
    socketService.onCampaignDeleted(mergedCallbacks.onCampaignDeleted!);
    socketService.onContentPieceCreated(mergedCallbacks.onContentPieceCreated!);
    socketService.onContentPieceUpdated(mergedCallbacks.onContentPieceUpdated!);
    socketService.onContentPieceDeleted(mergedCallbacks.onContentPieceDeleted!);
    socketService.onDraftGenerated(mergedCallbacks.onDraftGenerated!);
    socketService.onDraftUpdated(mergedCallbacks.onDraftUpdated!);
    socketService.onDraftDeleted(mergedCallbacks.onDraftDeleted!);
    socketService.onAIGenerationStarted(mergedCallbacks.onAIGenerationStarted!);
    socketService.onAIGenerationCompleted(mergedCallbacks.onAIGenerationCompleted!);
    socketService.onAIGenerationFailed(mergedCallbacks.onAIGenerationFailed!);
    socketService.onDocumentUploaded(mergedCallbacks.onDocumentUploaded!);
    socketService.onDocumentDeleted(mergedCallbacks.onDocumentDeleted!);
    socketService.onChainOfThoughts(mergedCallbacks.onChainOfThoughts!);

    // Cleanup on unmount
    return () => {
      socketService.removeAllListeners();
    };
  }, [callbacks, addToast]);

  // Return utility functions
  return {
    // Force refresh data (useful for components that need to update their state)
    refreshData: useCallback(() => {
      // This can be used by components to trigger a data refresh
      // Components can listen to this and call their refresh functions
    }, []),
  };
};
