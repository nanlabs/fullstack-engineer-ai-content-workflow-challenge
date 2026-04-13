import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { connected } = useRealtimeUpdates();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">ACME Content</h1>
          <p className="text-xs text-gray-500 mt-1">AI Workflow Manager</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/campaigns"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/campaigns'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={18} />
            Campaigns
          </Link>
          <Link
            to="/campaigns/new"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/campaigns/new'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <PlusCircle size={18} />
            New Campaign
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {connected ? (
              <><Wifi size={14} className="text-green-500" /> Live</>
            ) : (
              <><WifiOff size={14} className="text-red-400" /> Offline</>
            )}
          </div>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
