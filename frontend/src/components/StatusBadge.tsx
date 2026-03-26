import { ContentStatus } from '../lib/types';

const STATUS_STYLES: Record<ContentStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  AI_SUGGESTED: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  REVIEWED: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  REJECTED: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

const STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  AI_SUGGESTED: 'AI Suggested',
  REVIEWED: 'Reviewed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
