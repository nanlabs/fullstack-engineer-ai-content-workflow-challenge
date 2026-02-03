import type { ReactNode } from 'react'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--ink)]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
