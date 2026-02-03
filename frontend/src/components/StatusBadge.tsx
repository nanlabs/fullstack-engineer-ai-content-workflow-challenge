type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-strong)] text-[var(--ink)] border-[var(--line)]',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-strong)] border-[var(--accent-soft)]',
}

export default function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span className={`pill inline-flex items-center border ${toneStyles[tone]}`}>
      {label}
    </span>
  )
}
