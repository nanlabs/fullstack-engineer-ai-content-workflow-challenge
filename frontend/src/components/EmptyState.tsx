import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-panel rounded-2xl p-8 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[var(--surface-strong)]" />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
