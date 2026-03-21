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
    <div className="bg-white rounded-lg shadow p-5 mb-4">
      <h2 className="font-semibold mb-3">Review Actions</h2>
      {reviewNotes && (
        <p className="text-sm text-gray-500 mb-3 bg-gray-50 p-2 rounded">
          <strong>Notes:</strong> {reviewNotes}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        {status === 'AI_SUGGESTED' && (
          <>
            <button
              onClick={() => onChangeStatus('APPROVED')}
              disabled={isPending}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => onChangeStatus('REVIEWED')}
              disabled={isPending}
              className="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
            >
              Mark as Reviewed
            </button>
            <button
              onClick={() => onChangeStatus('REJECTED')}
              disabled={isPending}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50"
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
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => onChangeStatus('REJECTED')}
              disabled={isPending}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {status === 'REJECTED' && (
          <button
            onClick={() => onChangeStatus('DRAFT')}
            disabled={isPending}
            className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            Reset to Draft
          </button>
        )}
        {status === 'APPROVED' && (
          <p className="text-green-600 text-sm">✓ This content is approved.</p>
        )}
        {status === 'DRAFT' && !body && (
          <p className="text-gray-400 text-sm">Generate a draft first to enable review actions.</p>
        )}
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error.message}</p>
      )}
    </div>
  );
}
