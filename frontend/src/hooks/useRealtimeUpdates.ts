import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

export function useRealtimeUpdates(campaignId?: string) {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('draft:created', () => {
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['content'] });
    });

    socket.on('draft:updated', () => {
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['content'] });
      qc.invalidateQueries({ queryKey: ['campaign'] });
    });

    socket.on('campaign:updated', () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !campaignId) return;

    socket.emit('join:campaign', campaignId);
    return () => {
      socket.emit('leave:campaign', campaignId);
    };
  }, [campaignId]);

  return { connected };
}
