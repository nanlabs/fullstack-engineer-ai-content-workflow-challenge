'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';

interface NotificationContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isConnected, connect, disconnect, on, off } = useWebSocket({
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  // Campaign event handlers
  const handleCampaignCreated = useCallback((data: any) => {
    toast.success(`Campaign "${data.name}" created successfully!`, {
      icon: '🎯',
      duration: 4000,
    });
  }, []);

  const handleCampaignUpdated = useCallback((data: any) => {
    toast.success(`Campaign "${data.name}" updated!`, {
      icon: '✏️',
      duration: 3000,
    });
  }, []);

  const handleCampaignDeleted = useCallback((data: { id: string }) => {
    toast.success('Campaign deleted successfully!', {
      icon: '🗑️',
      duration: 3000,
    });
  }, []);

  // Content event handlers
  const handleContentCreated = useCallback((data: any) => {
    toast.success(`Content "${data.title}" created!`, {
      icon: '📝',
      duration: 4000,
    });
  }, []);

  const handleContentUpdated = useCallback((data: any) => {
    const statusEmojis: { [key: string]: string } = {
      DRAFT: '📝',
      AI_GENERATED: '🤖',
      APPROVED: '✅',
      REJECTED: '❌',
    };

    const emoji = statusEmojis[data.status] || '📝';
    
    toast.success(`Content "${data.title}" updated to ${data.status.replace('_', ' ')}!`, {
      icon: emoji,
      duration: 4000,
    });
  }, []);

  const handleContentDeleted = useCallback((data: { id: string }) => {
    toast.success('Content deleted successfully!', {
      icon: '🗑️',
      duration: 3000,
    });
  }, []);

  // Translation event handlers
  const handleTranslationCreated = useCallback((data: any) => {
    toast.success(`Translation to ${data.language} created!`, {
      icon: '🌍',
      duration: 4000,
    });
  }, []);

  const handleTranslationUpdated = useCallback((data: any) => {
    const statusEmojis: { [key: string]: string } = {
      PENDING: '⏳',
      COMPLETED: '✅',
      REVIEWED: '👀',
      FAILED: '❌',
    };

    const emoji = statusEmojis[data.status] || '🌍';
    
    toast.success(`Translation to ${data.language} ${data.status.toLowerCase()}!`, {
      icon: emoji,
      duration: 4000,
    });
  }, []);

  const handleTranslationDeleted = useCallback((data: { id: string }) => {
    toast.success('Translation deleted successfully!', {
      icon: '🗑️',
      duration: 3000,
    });
  }, []);

  // AI event handlers
  const handleAiGenerated = useCallback((data: any) => {
    toast.success(`AI content generated for "${data.title}"!`, {
      icon: '🤖',
      duration: 5000,
    });
  }, []);

  const handleAiGenerationStarted = useCallback((data: any) => {
    toast.loading(`Generating AI content for "${data.title}"...`, {
      icon: '🤖',
      duration: 2000,
    });
  }, []);

  const handleAiGenerationFailed = useCallback((data: any) => {
    toast.error(`Failed to generate AI content: ${data.error || 'Unknown error'}`, {
      icon: '❌',
      duration: 6000,
    });
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (isConnected) {
      // Campaign events
      on('campaign:created', handleCampaignCreated);
      on('campaign:updated', handleCampaignUpdated);
      on('campaign:deleted', handleCampaignDeleted);

      // Content events
      on('content:created', handleContentCreated);
      on('content:updated', handleContentUpdated);
      on('content:deleted', handleContentDeleted);

      // Translation events
      on('translation:created', handleTranslationCreated);
      on('translation:updated', handleTranslationUpdated);
      on('translation:deleted', handleTranslationDeleted);

      // AI events
      on('ai:generated', handleAiGenerated);
      on('ai:generation-started', handleAiGenerationStarted);
      on('ai:generation-failed', handleAiGenerationFailed);

      // Show connection success toast
      toast.success('Connected to real-time updates!', {
        icon: '🔗',
        duration: 2000,
      });
    }

    return () => {
      // Cleanup event listeners
      off('campaign:created', handleCampaignCreated);
      off('campaign:updated', handleCampaignUpdated);
      off('campaign:deleted', handleCampaignDeleted);
      off('content:created', handleContentCreated);
      off('content:updated', handleContentUpdated);
      off('content:deleted', handleContentDeleted);
      off('translation:created', handleTranslationCreated);
      off('translation:updated', handleTranslationUpdated);
      off('translation:deleted', handleTranslationDeleted);
      off('ai:generated', handleAiGenerated);
      off('ai:generation-started', handleAiGenerationStarted);
      off('ai:generation-failed', handleAiGenerationFailed);
    };
  }, [
    isConnected,
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
    handleAiGenerationStarted,
    handleAiGenerationFailed,
  ]);

  // Show disconnection warning
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!isConnected) {
      timeoutId = setTimeout(() => {
        toast.error('Lost connection to real-time updates', {
          icon: '🔌',
          duration: 4000,
        });
      }, 5000); // Wait 5 seconds before showing disconnection warning
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isConnected]);

  const value: NotificationContextType = {
    isConnected,
    connect,
    disconnect,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
}
