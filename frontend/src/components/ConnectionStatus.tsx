'use client';

import { useNotifications } from '@/contexts/NotificationContext';

export default function ConnectionStatus() {
  const { isConnected } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } ${isConnected ? 'animate-pulse' : ''}`} />
        <span>
          {isConnected ? 'Live updates active' : 'Connecting...'}
        </span>
      </div>
    </div>
  );
}
