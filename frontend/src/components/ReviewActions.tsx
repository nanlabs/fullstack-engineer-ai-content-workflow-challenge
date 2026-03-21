import type { ContentStatus } from '../lib/types';

interface ReviewActionsProps {
  status: ContentStatus;
  body: string;
  reviewNotes: string | null;
  isPending: boolean;
  error: Error | null;
  onChangeStatus: (status: ContentStatus, notes?: string) => void;
}

export function ReviewActions({
  status,
  body,
  reviewNotes,
  isPending,
  error,
  onChangeStatus,
}: ReviewActionsProps) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Review Actions</h2>
      {reviewNotes && (
        <div className="mb-4 bg-zinc-50 border border-zinc-200 rounded-md p-3">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold text-zinc-900 mr-2">Notes:</span>
            {reviewNotes}
          </p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        {status === 'AI_SUGGESTED' && (
          <>
            <button
              onClick={() => onChangeStatus('APPROVED')}
              disabled={isPending}
              className="btn-primary"
            >
              Approve
            </button>
            <button
              onClick={() => onChangeStatus('REVIEWED')}
              disabled={isPending}
              className="btn-secondary"
            >
              Mark as Reviewed
            </button>
            <button
              onClick={() => onChangeStatus('REJECTED')}
              disabled={isPending}
              className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Reject
            </button>
          </>
        )}
        {status === 'REVIEWED' && (
          <>
            <button
              onClick={() => onChangeStatus('APPROVED')}
              disabled={isPending}
              className="btn-primary"
            >
              Approve
            </button>
            <button
              onClick={() => onChangeStatus('REJECTED')}
              disabled={isPending}
              className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Reject
            </button>
          </>
        )}
        {status === 'REJECTED' && (
          <button
            onClick={() => onChangeStatus('DRAFT')}
            disabled={isPending}
            className="btn-secondary"
          >
            Reset to Draft
          </button>
        )}
        {status === 'APPROVED' && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            This content is approved.
          </div>
        )}
        {status === 'DRAFT' && !body && (
          <p className="text-zinc-500 text-sm">Generate a draft first to enable review actions.</p>
        )}
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error.message}
        </div>
      )}
    </div>
  );
}
