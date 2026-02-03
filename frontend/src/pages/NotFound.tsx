import { Link, useRouteError } from 'react-router-dom'

export default function NotFound() {
  const error = useRouteError() as { status?: number; statusText?: string } | null

  return (
    <section className="glass-panel rounded-3xl p-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
        {error?.status ?? 404}
      </p>
      <h1 className="mt-3 text-3xl font-semibold">This route drifted off course</h1>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {error?.statusText ?? 'We could not find the page you requested.'}
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          to="/"
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        >
          Return to campaigns
        </Link>
      </div>
    </section>
  )
}
