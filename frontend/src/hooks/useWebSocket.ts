import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

interface WebSocketEvents {
  // Campaign events
  'campaign:created': (data: any) => void;
  'campaign:updated': (data: any) => void;
  'campaign:deleted': (data: { id: string }) => void;

  // Content events
  'content:created': (data: any) => void;
  'content:updated': (data: any) => void;
  'content:deleted': (data: { id: string }) => void;

  // Translation events
  'translation:created': (data: any) => void;
  'translation:updated': (data: any) => void;
  'translation:deleted': (data: { id: string }) => void;

  // AI events
  'ai:generated': (data: any) => void;
  'ai:generation-started': (data: any) => void;
  'ai:generation-failed': (data: any) => void;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: <K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]) => void;
  off: <K extends keyof WebSocketEvents>(event: K, listener?: WebSocketEvents[K]) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Get user ID from token
  const getUserId = useCallback(() => {
    try {
      const token = Cookies.get('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.id;
      }
    } catch (error) {
      console.warn('Failed to parse user ID from token:', error);
    }
    return null;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const userId = getUserId();
    if (!userId) {
      console.warn('Cannot connect WebSocket: No user ID found');
      return;
    }

    userIdRef.current = userId;

    // Create new socket connection
    socketRef.current = io(BACKEND_URL, {
      withCredentials: true,
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      isConnectedRef.current = true;

      // Join user-specific room
      socket.emit('join', { userId });
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      isConnectedRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      isConnectedRef.current = false;
    });

    // Handle reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      isConnectedRef.current = true;

      // Re-join user room after reconnection
      if (userIdRef.current) {
        socket.emit('join', { userId: userIdRef.current });
      }
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket failed to reconnect after', reconnectionAttempts, 'attempts');
      isConnectedRef.current = false;
    });

  }, [reconnection, reconnectionAttempts, reconnectionDelay, getUserId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      const userId = userIdRef.current;
      if (userId) {
        socketRef.current.emit('leave', { userId });
      }
      
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
      userIdRef.current = null;
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }, []);

  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    listener: WebSocketEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event as string, listener as any);
    }
  }, []);

  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    listener?: WebSocketEvents[K]
  ) => {
    if (socketRef.current) {
      if (listener) {
        socketRef.current.off(event as string, listener as any);
      } else {
        socketRef.current.off(event as string);
      }
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Watch for token changes (login/logout)
  useEffect(() => {
    const checkToken = () => {
      const token = Cookies.get('token');
      const currentUserId = getUserId();

      if (!token && socketRef.current?.connected) {
        // User logged out, disconnect
        disconnect();
      } else if (token && currentUserId && currentUserId !== userIdRef.current) {
        // User changed or logged in, reconnect
        disconnect();
        setTimeout(connect, 100);
      }
    };

    // Check token every 5 seconds
    const interval = setInterval(checkToken, 5000);

    return () => clearInterval(interval);
  }, [connect, disconnect, getUserId]);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}
