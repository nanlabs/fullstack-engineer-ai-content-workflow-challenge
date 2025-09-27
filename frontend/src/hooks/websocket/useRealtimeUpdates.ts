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
    onCampaignUpdated: (campaign) => {
      addToast({
        type: 'info',
        title: 'Campaign Updated',
        message: `Campaign "${campaign.name}" was updated`,
      });
    },
    onCampaignDeleted: () => {
      addToast({
        type: 'info',
        title: 'Campaign Deleted',
        message: 'A campaign was deleted',
      });
    },
    onContentPieceCreated: (contentPiece) => {
      addToast({
        type: 'success',
        title: 'New Content Piece',
        message: `Content piece "${contentPiece.title}" was created`,
      });
    },
    onContentPieceUpdated: () => {
      // Don't show toast for content piece updates - too noisy
    },
    onContentPieceDeleted: () => {
      addToast({
        type: 'info',
        title: 'Content Piece Deleted',
        message: 'A content piece was deleted',
      });
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
      addToast({
        type: 'info',
        title: 'Draft Deleted',
        message: 'A draft was deleted',
      });
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
