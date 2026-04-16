import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Sparkles } from 'lucide-react';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { connected } = useRealtimeUpdates();

  const navItems = [
    { to: '/campaigns', icon: LayoutDashboard, label: 'Campaigns' },
    { to: '/campaigns/new', icon: PlusCircle, label: 'New Campaign' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-surface-base)' }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-64 flex flex-col border-r"
        style={{
          background: 'var(--color-surface-panel)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {/* Brand */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-accent)' }}
            >
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1
                className="text-sm leading-tight"
                style={{ color: 'var(--color-text-primary)', fontWeight: 510 }}
              >
                ACME Content
              </h1>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}>
                AI Workflow Manager
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === '/campaigns'
                ? location.pathname === '/campaigns'
                : location.pathname.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors"
                style={{
                  fontWeight: 510,
                  background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: isActive
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                  }
                }}
              >
                <Icon size={16} />
                {label}
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-accent-bright)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Connection status */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 text-[11px]" style={{ fontWeight: 510 }}>
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: connected ? '#27a644' : 'var(--color-error)',
              }}
            >
              {connected && (
                <div
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: '#27a644' }}
                />
              )}
            </div>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto" style={{ background: 'var(--color-surface-base)' }}>
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
