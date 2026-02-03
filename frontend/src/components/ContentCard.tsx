import { Link } from 'react-router-dom'

import { formatDate } from '../lib/format'
import type { ContentPiece } from '../lib/types'
import StatusBadge from './StatusBadge'

type ContentCardProps = {
  content: ContentPiece
  onGenerateDraft?: () => void
  onDelete?: () => void
  generating?: boolean
}

const reviewTone: Record<ContentPiece['reviewState'], 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  AI_SUGGESTED: 'accent',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

export default function ContentCard({ content, onGenerateDraft, onDelete, generating }: ContentCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-[var(--ink)]">{content.title}</h4>
          <p className="mt-1 text-sm text-[var(--muted)]">{content.type}</p>
        </div>
        <StatusBadge label={content.reviewState} tone={reviewTone[content.reviewState]} />
      </div>
      <p className="mt-4 max-h-12 overflow-hidden text-sm text-[var(--muted)]">{content.originalText}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span className="pill">Updated {formatDate(content.updatedAt)}</span>
        {content.aiDraft ? <span className="pill">AI draft ready</span> : <span className="pill">AI draft pending</span>}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={`/content/${content.id}`}
          className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink)] transition hover:border-[var(--accent-soft)]"
        >
          Open
        </Link>
        <Link
          to={`/content/${content.id}/review`}
          className="rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--accent-strong)]"
        >
          Review
        </Link>
        {onGenerateDraft ? (
          <button
            type="button"
            onClick={onGenerateDraft}
            disabled={generating}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)] transition hover:border-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? 'Generating...' : 'Generate AI draft'}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-600 transition hover:border-rose-300"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  )
}
