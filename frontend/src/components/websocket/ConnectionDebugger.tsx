"use client";

import React, { useState, useEffect } from "react";
import { socketService } from "@/lib/websocket/socket";

export const ConnectionDebugger: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [listenerCounts, setListenerCounts] = useState<Record<string, number>>({});
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    const socket = socketService.connect();
    
    const updateConnectionStatus = () => {
      setIsConnected(socketService.isSocketConnected());
    };

    const updateListenerCounts = () => {
      setListenerCounts({
        'campaign-created': socketService.getListenerCount('campaign-created'),
        'campaign-updated': socketService.getListenerCount('campaign-updated'),
        'campaign-deleted': socketService.getListenerCount('campaign-deleted'),
        'content-piece-created': socketService.getListenerCount('content-piece-created'),
        'content-piece-updated': socketService.getListenerCount('content-piece-updated'),
        'content-piece-deleted': socketService.getListenerCount('content-piece-deleted'),
        'total': socketService.getListenerCount()
      });
    };

    // Initial update
    updateConnectionStatus();
    updateListenerCounts();

    // Set up interval to update stats
    const interval = setInterval(() => {
      updateConnectionStatus();
      updateListenerCounts();
      // Clear processed events every 30 seconds to prevent memory leaks
      socketService.clearProcessedEvents();
    }, 1000);

    // Listen for all events to log them
    const logEvent = (eventName: string) => (data: unknown) => {
      setEventLog(prev => [
        `${new Date().toLocaleTimeString()}: ${eventName}`,
        ...prev.slice(0, 9) // Keep only last 10 events
      ]);
    };

    // Add temporary listeners for debugging
    socketService.onCampaignCreated(logEvent('campaign-created'));
    socketService.onCampaignUpdated(logEvent('campaign-updated'));
    socketService.onCampaignDeleted(logEvent('campaign-deleted'));
    socketService.onContentPieceCreated(logEvent('content-piece-created'));
    socketService.onContentPieceUpdated(logEvent('content-piece-updated'));
    socketService.onContentPieceDeleted(logEvent('content-piece-deleted'));

    return () => {
      clearInterval(interval);
      // Note: We don't clean up the debug listeners to avoid interfering with the actual app
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold text-sm mb-2">WebSocket Debug</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div>
          <div className="font-medium">Listener Counts:</div>
          {Object.entries(listenerCounts).map(([event, count]) => (
            <div key={event} className="ml-2">
              {event}: {count}
            </div>
          ))}
        </div>
        
        {eventLog.length > 0 && (
          <div>
            <div className="font-medium">Recent Events:</div>
            <div className="max-h-20 overflow-y-auto">
              {eventLog.map((event, index) => (
                <div key={index} className="text-xs text-gray-600">
                  {event}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
