'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseRealTimeUpdatesOptions {
  // Callbacks for different entity updates
  onCampaignUpdate?: () => void;
  onContentUpdate?: () => void;
  onTranslationUpdate?: () => void;
  
  // Specific entity IDs to watch for updates
  campaignId?: string;
  contentId?: string;
  
  // Enable/disable auto-refresh
  enabled?: boolean;
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const {
    onCampaignUpdate,
    onContentUpdate,
    onTranslationUpdate,
    campaignId,
    contentId,
    enabled = true,
  } = options;

  const { on, off, isConnected } = useWebSocket({ autoConnect: false });
  
  // Use refs to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Campaign event handlers
  const handleCampaignCreated = useCallback(() => {
    if (optionsRef.current.onCampaignUpdate) {
      optionsRef.current.onCampaignUpdate();
    }
  }, []);

  const handleCampaignUpdated = useCallback((data: any) => {
    const { onCampaignUpdate, campaignId: watchedCampaignId } = optionsRef.current;
    
    if (onCampaignUpdate) {
      // If watching a specific campaign, only update if it matches
      if (!watchedCampaignId || data.id === watchedCampaignId) {
        onCampaignUpdate();
      }
    }
  }, []);

  const handleCampaignDeleted = useCallback((data: { id: string }) => {
    const { onCampaignUpdate, campaignId: watchedCampaignId } = optionsRef.current;
    
    if (onCampaignUpdate) {
      // If watching a specific campaign, only update if it matches
      if (!watchedCampaignId || data.id === watchedCampaignId) {
        onCampaignUpdate();
      }
    }
  }, []);

  // Content event handlers
  const handleContentCreated = useCallback((data: any) => {
    const { onContentUpdate, campaignId: watchedCampaignId } = optionsRef.current;
    
    if (onContentUpdate) {
      // If watching a specific campaign, only update if content belongs to it
      if (!watchedCampaignId || data.campaignId === watchedCampaignId) {
        onContentUpdate();
      }
    }
  }, []);

  const handleContentUpdated = useCallback((data: any) => {
    const { onContentUpdate, contentId: watchedContentId, campaignId: watchedCampaignId } = optionsRef.current;
    
    if (onContentUpdate) {
      // Update if watching specific content ID or campaign ID
      const shouldUpdate = !watchedContentId && !watchedCampaignId || 
                          (watchedContentId && data.id === watchedContentId) ||
                          (watchedCampaignId && data.campaignId === watchedCampaignId);
      
      if (shouldUpdate) {
        onContentUpdate();
      }
    }
  }, []);

  const handleContentDeleted = useCallback((data: { id: string }) => {
    const { onContentUpdate, contentId: watchedContentId } = optionsRef.current;
    
    if (onContentUpdate) {
      // Always refresh content list when something is deleted
      // unless we were watching a specific content that got deleted
      if (!watchedContentId || data.id === watchedContentId) {
        onContentUpdate();
      }
    }
  }, []);

  // Translation event handlers
  const handleTranslationCreated = useCallback((data: any) => {
    const { onTranslationUpdate, contentId: watchedContentId } = optionsRef.current;
    
    if (onTranslationUpdate) {
      // Update if watching the content that got a new translation
      if (!watchedContentId || data.contentPieceId === watchedContentId) {
        onTranslationUpdate();
      }
    }
  }, []);

  const handleTranslationUpdated = useCallback((data: any) => {
    const { onTranslationUpdate, contentId: watchedContentId } = optionsRef.current;
    
    if (onTranslationUpdate) {
      // Update if watching the content that has updated translation
      if (!watchedContentId || data.contentPieceId === watchedContentId) {
        onTranslationUpdate();
      }
    }
  }, []);

  const handleTranslationDeleted = useCallback((data: { id: string, contentPieceId?: string }) => {
    const { onTranslationUpdate, contentId: watchedContentId } = optionsRef.current;
    
    if (onTranslationUpdate) {
      // Update if watching the content that lost a translation
      if (!watchedContentId || data.contentPieceId === watchedContentId) {
        onTranslationUpdate();
      }
    }
  }, []);

  // AI event handlers (these typically update content)
  const handleAiGenerated = useCallback((data: any) => {
    const { onContentUpdate, contentId: watchedContentId } = optionsRef.current;
    
    if (onContentUpdate) {
      if (!watchedContentId || data.id === watchedContentId) {
        onContentUpdate();
      }
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    // Campaign events
    if (onCampaignUpdate) {
      on('campaign:created', handleCampaignCreated);
      on('campaign:updated', handleCampaignUpdated);
      on('campaign:deleted', handleCampaignDeleted);
    }

    // Content events
    if (onContentUpdate) {
      on('content:created', handleContentCreated);
      on('content:updated', handleContentUpdated);
      on('content:deleted', handleContentDeleted);
      on('ai:generated', handleAiGenerated);
    }

    // Translation events
    if (onTranslationUpdate) {
      on('translation:created', handleTranslationCreated);
      on('translation:updated', handleTranslationUpdated);
      on('translation:deleted', handleTranslationDeleted);
    }

    return () => {
      // Cleanup event listeners
      if (onCampaignUpdate) {
        off('campaign:created', handleCampaignCreated);
        off('campaign:updated', handleCampaignUpdated);
        off('campaign:deleted', handleCampaignDeleted);
      }

      if (onContentUpdate) {
        off('content:created', handleContentCreated);
        off('content:updated', handleContentUpdated);
        off('content:deleted', handleContentDeleted);
        off('ai:generated', handleAiGenerated);
      }

      if (onTranslationUpdate) {
        off('translation:created', handleTranslationCreated);
        off('translation:updated', handleTranslationUpdated);
        off('translation:deleted', handleTranslationDeleted);
      }
    };
  }, [
    enabled,
    isConnected,
    onCampaignUpdate,
    onContentUpdate,
    onTranslationUpdate,
    on,
    off,
    handleCampaignCreated,
    handleCampaignUpdated,
    handleCampaignDeleted,
    handleContentCreated,
    handleContentUpdated,
    handleContentDeleted,
    handleTranslationCreated,
    handleTranslationUpdated,
    handleTranslationDeleted,
    handleAiGenerated,
  ]);

  return {
    isConnected,
  };
}
