import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
    isActive
      ? 'bg-[var(--accent)] text-white'
      : 'border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent-soft)]'
  }`

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(255,248,240,0.8)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
              ACME Global Media
            </p>
            <h2 className="text-2xl font-semibold text-[var(--ink)]">AI Content Workflow</h2>
          </div>
          <nav className="flex flex-wrap gap-3">
            <NavLink to="/" className={linkClass} end>
              Campaigns
            </NavLink>
            <NavLink to="/campaigns/new" className={linkClass}>
              New Campaign
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--line)] bg-[rgba(255,248,240,0.8)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-[var(--muted)]">
          <span>Real-time content ops, tuned for speed.</span>
          <span>Backend: NestJS · Frontend: React</span>
        </div>
      </footer>
    </div>
  )
}
