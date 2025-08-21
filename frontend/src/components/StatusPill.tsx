type Tone = 'approved' | 'negotiation' | 'pending' | 'rejected';

export default function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Tone;
}) {
  const toneMap: Record<Tone, string> = {
    approved:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    negotiation: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
    pending:     'bg-slate-50  text-slate-700  ring-1 ring-slate-200',
    rejected:    'bg-rose-50   text-rose-700   ring-1 ring-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${toneMap[tone]}`}
    >
      <span className="tabular-nums">{value}</span> {label}
    </span>
  );
}
