import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';

export function useEventSource() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;
      // Close any stale connection before opening a new one
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      if (!token) return;

      const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.onmessage = (event) => {
        // Heartbeat messages start with ":" — ignore them
        if (!event.data || event.data.startsWith(':')) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type?.startsWith('content.')) {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['content'] });
          }
          if (parsed.type?.startsWith('campaign.')) {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!disposed && token) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [queryClient, token]);
}
