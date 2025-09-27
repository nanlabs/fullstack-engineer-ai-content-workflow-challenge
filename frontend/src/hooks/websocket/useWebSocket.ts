import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/lib/websocket/socket';
import { useToast } from '@/components/ui/ToastProvider';
import { Socket } from 'socket.io-client';

interface WebSocketStatus {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useWebSocket = () => {
  const [status, setStatus] = useState<WebSocketStatus>({
    isConnected: false,
    connectionStatus: 'disconnected',
  });
  const { addToast } = useToast();
  const socketRef = useRef<Socket>(null);
  const hasShownInitialToast = useRef(false);

  useEffect(() => {
    // Connect to WebSocket
    setStatus(prev => ({ ...prev, connectionStatus: 'connecting' }));
    socketRef.current = socketService.connect();

    // Connection event handlers
    const handleConnect = () => {
      setStatus({
        isConnected: true,
        connectionStatus: 'connected',
      });
      
      // Only show toast for reconnections, not initial connection
      if (hasShownInitialToast.current) {
        addToast({
          type: 'success',
          title: 'Reconnected',
          message: 'Real-time updates are now active',
        });
      } else {
        hasShownInitialToast.current = true;
      }
    };

    const handleDisconnect = () => {
      setStatus({
        isConnected: false,
        connectionStatus: 'disconnected',
      });
      
      // Only show disconnect toast if we were previously connected
      // if (hasShownInitialToast.current) {
      //   addToast({
      //     type: 'warning',
      //     title: 'Disconnected',
      //     message: 'Real-time updates are offline',
      //   });
      // }
    };

    const handleConnectError = () => {
      setStatus({
        isConnected: false,
        connectionStatus: 'error',
      });
      
      // Always show error toasts
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to real-time updates',
      });
    };

    // Set up event listeners
    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('disconnect', handleDisconnect);
    socketRef.current.on('connect_error', handleConnectError);

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect', handleConnect);
        socketRef.current.off('disconnect', handleDisconnect);
        socketRef.current.off('connect_error', handleConnectError);
      }
    };
  }, [addToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  return {
    ...status,
    socket: socketRef.current,
    socketService,
  };
};
