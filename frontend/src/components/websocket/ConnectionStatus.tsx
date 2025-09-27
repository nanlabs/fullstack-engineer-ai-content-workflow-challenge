"use client";

import React from "react";
import { useWebSocket } from "@/hooks/websocket/useWebSocket";

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus } = useWebSocket();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Real-time updates active";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Offline";
      case "error":
        return "Connection error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-gray-600">{getStatusText()}</span>
    </div>
  );
};
