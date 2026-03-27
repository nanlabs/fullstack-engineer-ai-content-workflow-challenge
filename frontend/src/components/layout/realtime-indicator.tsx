'use client';

import { cn } from '@/lib/utils';

interface RealtimeIndicatorProps {
  isConnected: boolean;
}

export function RealtimeIndicator({ isConnected }: RealtimeIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500',
          )}
        />
      </span>
      <span className="text-xs text-gray-500">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
