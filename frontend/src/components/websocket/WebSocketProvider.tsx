'use client';

import React from 'react';
import { useWebSocket } from '@/hooks/websocket/useWebSocket';
import { useRealtimeUpdates } from '@/hooks/websocket/useRealtimeUpdates';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  // Initialize WebSocket connection
  useWebSocket();
  
  // Set up real-time update listeners
  useRealtimeUpdates();

  return <>{children}</>;
};
