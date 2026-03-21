import { ContentStatus } from '../lib/types';

const STATUS_STYLES: Record<ContentStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  AI_SUGGESTED: 'bg-blue-100 text-blue-700',
  REVIEWED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
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
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
