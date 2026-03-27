'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface RealtimeCallbacks {
  onContentUpdated?: (data: { campaignId: string; contentId: string }) => void;
  onDraftGenerated?: (data: { contentId: string; draftId: string }) => void;
  onTranslationCreated?: (data: { contentId: string; translationId: string }) => void;
}

interface UseRealtimeReturn {
  isConnected: boolean;
}

export function useRealtime(callbacks?: RealtimeCallbacks): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);

  const stableOnContentUpdated = useCallback(
    (data: { campaignId: string; contentId: string }) => {
      callbacks?.onContentUpdated?.(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callbacks?.onContentUpdated],
  );

  const stableOnDraftGenerated = useCallback(
    (data: { contentId: string; draftId: string }) => {
      callbacks?.onDraftGenerated?.(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callbacks?.onDraftGenerated],
  );

  const stableOnTranslationCreated = useCallback(
    (data: { contentId: string; translationId: string }) => {
      callbacks?.onTranslationCreated?.(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callbacks?.onTranslationCreated],
  );

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('content:updated', stableOnContentUpdated);
    socket.on('draft:generated', stableOnDraftGenerated);
    socket.on('translation:created', stableOnTranslationCreated);

    // Sync initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('content:updated', stableOnContentUpdated);
      socket.off('draft:generated', stableOnDraftGenerated);
      socket.off('translation:created', stableOnTranslationCreated);
    };
  }, [stableOnContentUpdated, stableOnDraftGenerated, stableOnTranslationCreated]);

  return { isConnected };
}
