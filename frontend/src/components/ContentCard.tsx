import { useState } from 'react';
import type { ContentStatus } from '../lib/types';

interface ContentCardProps {
  body: string;
  status: ContentStatus;
  reviewNotes: string | null;
  isPending: boolean;
  error: Error | null;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate?: () => void;
  onReopen?: () => void;
  onSave?: (body: string, notes: string) => void;
  regenerateLabel?: string;
}

export function ContentCard({
  body,
  status,
  reviewNotes,
  isPending,
  error,
  onApprove,
  onReject,
  onRegenerate,
  onReopen,
  onSave,
  regenerateLabel = 'Regenerate',
}: ContentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const startEdit = () => {
    setEditBody(body);
    setEditNotes(reviewNotes ?? '');
    setIsEditing(true);
  };

  if (isEditing && onSave) {
    return (
      <div className="space-y-4">
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          className="input-field min-h-[200px] font-mono whitespace-pre-wrap leading-relaxed"
          maxLength={10000}
        />
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Review notes (optional)"
          className="input-field"
          rows={2}
          maxLength={5000}
        />
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              onSave(editBody, editNotes);
              setIsEditing(false);
            }}
            className="btn-primary"
          >
            Save Changes
          </button>
          <button onClick={() => setIsEditing(false)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Body */}
      {body ? (
        <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-relaxed text-[15px]">{body}</p>
      ) : (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-md p-8 text-center">
          <p className="text-zinc-500 text-sm">
            No content yet. Generate a draft using AI Tools below.
          </p>
        </div>
      )}

      {/* Review notes */}
      {reviewNotes && (
        <div className="mt-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md p-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 mr-2">Notes:</span>
            {reviewNotes}
          </p>
        </div>
      )}

      {/* Actions */}
      {body && (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {status === 'APPROVED' ? (
            <>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Approved
              </div>
              {onReopen && (
                <button
                  onClick={onReopen}
                  disabled={isPending}
                  className="btn-secondary text-zinc-500 hover:text-zinc-800"
                >
                  Reopen
                </button>
              )}
            </>
          ) : status === 'REJECTED' ? (
            <>
              {onRegenerate && (
                <button onClick={onRegenerate} disabled={isPending} className="btn-secondary">
                  {regenerateLabel}
                </button>
              )}
              {onReopen && (
                <button
                  onClick={onReopen}
                  disabled={isPending}
                  className="btn-secondary text-zinc-500 hover:text-zinc-800"
                >
                  Reopen
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={onApprove} disabled={isPending} className="btn-primary">
                Approve
              </button>
              <button
                onClick={onReject}
                disabled={isPending}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                Reject
              </button>
              {onRegenerate && (
                <button onClick={onRegenerate} disabled={isPending} className="btn-secondary">
                  {regenerateLabel}
                </button>
              )}
            </>
          )}

          {onSave && (
            <button
              onClick={startEdit}
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-4 hover:underline transition-colors ml-auto"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800">
          {error.message}
        </div>
      )}
    </div>
  );
}
