'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, LayoutDashboard } from 'lucide-react';
import { RealtimeIndicator } from './realtime-indicator';
import { useRealtime } from '@/hooks/use-realtime';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useRealtime();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/campaigns" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm group-hover:bg-indigo-700 transition-colors">
            <Globe className="h-4.5 w-4.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">
              ACME Global Media
            </p>
            <p className="text-xs text-gray-500 leading-none mt-0.5">
              AI Content Workflow
            </p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/campaigns"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/campaigns')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Campaigns
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <RealtimeIndicator isConnected={isConnected} />
        </div>
      </div>
    </header>
  );
}
